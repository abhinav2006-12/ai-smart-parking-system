import { useState, useRef } from "react";
import { normalizeIndianPlate, isLikelyValidIndianPlate } from "../lib/plate";

export default function PlateCapture({ onDetected, label }) {
  const [photo, setPhoto] = useState(null); // dataURL
  const [processedPreview, setProcessedPreview] = useState(null);
  const [status, setStatus] = useState("idle"); // idle | processing | done | error
  const [statusMessage, setStatusMessage] = useState("");
  const fileInputRef = useRef(null);
  const canvasRef = useRef(null);

  const handleFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      setPhoto(e.target.result);
      runOCR(e.target.result);
    };
    reader.readAsDataURL(file);
  };

  // Adaptive binarization using Bradley-Roth algorithm (integral image)
  const adaptiveThreshold = (d, width, height) => {
    // 1. Grayscale conversion in-place
    const gray = new Uint8Array(width * height);
    for (let i = 0; i < d.length; i += 4) {
      gray[i / 4] = Math.round(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]);
    }

    // 2. Compute 2D integral image
    const intImg = new Uint32Array(width * height);
    for (let x = 0; x < width; x++) {
      let sum = 0;
      for (let y = 0; y < height; y++) {
        const idx = y * width + x;
        sum += gray[idx];
        if (x === 0) {
          intImg[idx] = sum;
        } else {
          intImg[idx] = intImg[idx - 1] + sum;
        }
      }
    }

    // 3. Local thresholding
    const S = Math.max(15, Math.floor(width / 25)) | 1; // Window size (must be odd)
    const T = 0.15; // Threshold ratio
    const sDiv2 = Math.floor(S / 2);

    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        const idx = y * width + x;

        const x1 = Math.max(0, x - sDiv2);
        const x2 = Math.min(width - 1, x + sDiv2);
        const y1 = Math.max(0, y - sDiv2);
        const y2 = Math.min(height - 1, y + sDiv2);

        const count = (x2 - x1 + 1) * (y2 - y1 + 1);

        let sum = 0;
        const idx_x2_y2 = y2 * width + x2;
        sum += intImg[idx_x2_y2];

        if (x1 > 0) sum -= intImg[y2 * width + (x1 - 1)];
        if (y1 > 0) sum -= intImg[(y1 - 1) * width + x2];
        if (x1 > 0 && y1 > 0) sum += intImg[(y1 - 1) * width + (x1 - 1)];

        if (gray[idx] * count < sum * (1.0 - T)) {
          d[idx * 4] = d[idx * 4 + 1] = d[idx * 4 + 2] = 0; // Black (text)
        } else {
          d[idx * 4] = d[idx * 4 + 1] = d[idx * 4 + 2] = 255; // White (background)
        }
      }
    }

    // 4. Auto-invert if binarized image is mostly dark (black background plates)
    let blackCount = 0;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i] === 0) blackCount++;
    }
    if (blackCount > (width * height) * 0.5) {
      for (let i = 0; i < d.length; i += 4) {
        d[i] = d[i + 1] = d[i + 2] = 255 - d[i];
      }
    }
  };

  const preprocess = (imgEl, shouldCrop) => {
    const canvas = canvasRef.current;
    
    let cropWidth = imgEl.naturalWidth;
    let cropHeight = imgEl.naturalHeight;
    let cropX = 0;
    let cropY = 0;

    if (shouldCrop) {
      // Auto-crop to center 80% width and 35% height where plate is usually centered
      cropWidth = imgEl.naturalWidth * 0.8;
      cropHeight = imgEl.naturalHeight * 0.35;
      cropX = (imgEl.naturalWidth - cropWidth) / 2;
      cropY = (imgEl.naturalHeight - cropHeight) / 2;
    }

    const targetW = Math.min(1200, cropWidth * 2);
    const scale = targetW / cropWidth;
    canvas.width = targetW;
    canvas.height = cropHeight * scale;
    
    const ctx = canvas.getContext("2d");
    ctx.drawImage(
      imgEl,
      cropX,
      cropY,
      cropWidth,
      cropHeight,
      0,
      0,
      canvas.width,
      canvas.height
    );

    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    adaptiveThreshold(imgData.data, canvas.width, canvas.height);
    ctx.putImageData(imgData, 0, 0);
    return canvas.toDataURL("image/png");
  };

  const runOCR = async (dataUrl) => {
    setStatus("processing");
    setStatusMessage("Reading plate (pass 1/3)…");
    try {
      const img = new Image();
      img.src = dataUrl;
      await new Promise((res) => {
        img.onload = res;
      });

      const { default: Tesseract } = await import("tesseract.js");

      // Pass 1: Cropped & Adaptively Thresholded (Ideal case)
      const processedUrlCropped = preprocess(img, true);
      setProcessedPreview(processedUrlCropped);

      const result1 = await Tesseract.recognize(processedUrlCropped, "eng", {
        tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
        tessedit_pageseg_mode: "6", // SINGLE_BLOCK (assume a single uniform block of text)
      });
      const text1 = result1.data.text || "";
      let normalized = normalizeIndianPlate(text1);

      if (isLikelyValidIndianPlate(normalized)) {
        setStatus("done");
        onDetected(normalized, dataUrl);
        return;
      }

      // Pass 2 Fallback: Full Image & Adaptively Thresholded (Off-center or pre-cropped plates)
      setStatusMessage("Reading plate (pass 2/3)…");
      const processedUrlFull = preprocess(img, false);
      setProcessedPreview(processedUrlFull);

      const result2 = await Tesseract.recognize(processedUrlFull, "eng", {
        tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
        tessedit_pageseg_mode: "6", // SINGLE_BLOCK (assume a single uniform block of text)
      });
      const text2 = result2.data.text || "";
      normalized = normalizeIndianPlate(text2);

      if (isLikelyValidIndianPlate(normalized)) {
        setStatus("done");
        onDetected(normalized, dataUrl);
        return;
      }

      // Pass 3 Fallback: Raw original image (handles weird contrast/thresholding artifacts)
      setStatusMessage("Reading plate (pass 3/3)…");
      setProcessedPreview(null);

      const result3 = await Tesseract.recognize(dataUrl, "eng", {
        tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
        tessedit_pageseg_mode: "3", // AUTO (fully automatic page segmentation)
      });
      const text3 = result3.data.text || "";
      normalized = normalizeIndianPlate(text3);

      setStatus("done");
      if (normalized) {
        onDetected(normalized, dataUrl);
      } else {
        onDetected("", dataUrl);
      }
    } catch (err) {
      console.error(err);
      setStatus("error");
      onDetected("", dataUrl);
    }
  };

  const retake = () => {
    setPhoto(null);
    setProcessedPreview(null);
    setStatus("idle");
    onDetected("", null);
  };

  return (
    <div>
      <label>{label}</label>
      <canvas ref={canvasRef} style={{ display: "none" }}></canvas>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: "none" }}
        onChange={(e) => handleFile(e.target.files[0])}
      />

      {!photo && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <button
            type="button"
            onClick={() => fileInputRef.current.click()}
            className="btn"
            style={{
              width: "100%",
              border: "1px solid var(--border)",
              background: "var(--surface-muted)",
              color: "var(--muted)",
              padding: "26px 16px",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M4 16l4.5-6 3 4 2.5-3L20 16" />
              <rect x="3" y="5" width="18" height="14" rx="2" />
              <circle cx="8" cy="9" r="1.2" fill="currentColor" />
            </svg>
            <span style={{ fontSize: 13.5, fontWeight: 600 }}>Upload / capture plate photo</span>
          </button>
          <div style={{ fontSize: 12.5, color: "var(--muted)", textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontWeight: 500 }}>
            <span>💡</span>
            <span>For best results, center the license plate in the frame.</span>
          </div>
        </div>
      )}

      {photo && (
        <div className="card" style={{ overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: processedPreview ? "1fr 1fr" : "1fr" }}>
            <img src={photo} alt="Captured plate" style={{ width: "100%", display: "block", maxHeight: 160, objectFit: "cover" }} />
            {processedPreview && (
              <img
                src={processedPreview}
                alt="Processed for OCR"
                style={{ width: "100%", display: "block", maxHeight: 160, objectFit: "cover", filter: "contrast(1.1)" }}
              />
            )}
          </div>
          <div style={{ padding: "10px 12px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, borderTop: "1px solid var(--border)" }}>
            <div style={{ fontSize: 12.5, display: "flex", alignItems: "center", gap: 6 }}>
              {status === "processing" && (
                <>
                  <span
                    className="spin"
                    style={{
                      width: 13,
                      height: 13,
                      border: "2px solid var(--border)",
                      borderTopColor: "var(--accent)",
                      borderRadius: "50%",
                      display: "inline-block",
                    }}
                  ></span>
                  <span style={{ color: "var(--muted)" }}>{statusMessage}</span>
                </>
              )}
              {status === "done" && <span style={{ color: "var(--success)", fontWeight: 600 }}>✓ Detected — please verify below</span>}
              {status === "error" && <span style={{ color: "var(--danger)", fontWeight: 600 }}>Couldn't read it — enter manually</span>}
            </div>
            <button type="button" onClick={retake} className="btn btn-ghost" style={{ padding: "4px 10px", fontSize: 12.5 }}>
              Retake
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
