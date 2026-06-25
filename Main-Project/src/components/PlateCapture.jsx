import { useState, useRef } from "react";
import { normalizeIndianPlate } from "../lib/plate";

export default function PlateCapture({ onDetected, label }) {
  const [photo, setPhoto] = useState(null); // dataURL
  const [processedPreview, setProcessedPreview] = useState(null);
  const [status, setStatus] = useState("idle"); // idle | processing | done | error
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

  // Preprocess: crop center + grayscale + contrast stretch + upscale, tuned for plate text.
  const preprocess = (imgEl) => {
    const canvas = canvasRef.current;
    
    // Auto-crop to the middle region (80% width and 35% height)
    // where license plates are most commonly positioned.
    const cropWidth = imgEl.naturalWidth * 0.8;
    const cropHeight = imgEl.naturalHeight * 0.35;
    const cropX = (imgEl.naturalWidth - cropWidth) / 2;
    const cropY = (imgEl.naturalHeight - cropHeight) / 2;

    const targetW = Math.min(1200, cropWidth * 2);
    const scale = targetW / cropWidth;
    canvas.width = targetW;
    canvas.height = cropHeight * scale;
    
    const ctx = canvas.getContext("2d");
    
    // Draw only the cropped center region to canvas
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
    const d = imgData.data;
    let min = 255,
      max = 0;
    for (let i = 0; i < d.length; i += 4) {
      const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      d[i] = d[i + 1] = d[i + 2] = gray;
      if (gray < min) min = gray;
      if (gray > max) max = gray;
    }
    const range = Math.max(1, max - min);
    for (let i = 0; i < d.length; i += 4) {
      const v = ((d[i] - min) / range) * 255;
      // High contrast thresholding curve
      const enhanced = v < 120 ? Math.max(0, v * 0.6) : Math.min(255, v * 1.3);
      d[i] = d[i + 1] = d[i + 2] = enhanced;
    }
    ctx.putImageData(imgData, 0, 0);
    return canvas.toDataURL("image/png");
  };

  const runOCR = async (dataUrl) => {
    setStatus("processing");
    try {
      const img = new Image();
      img.src = dataUrl;
      await new Promise((res) => {
        img.onload = res;
      });
      const processedUrl = preprocess(img);
      setProcessedPreview(processedUrl);

      const { default: Tesseract } = await import("tesseract.js");
      const result = await Tesseract.recognize(processedUrl, "eng", {
        tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
      });
      const text = result.data.text || "";
      const normalized = normalizeIndianPlate(text);
      setStatus("done");
      onDetected(normalized, dataUrl);
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
                  <span style={{ color: "var(--muted)" }}>Reading plate…</span>
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
