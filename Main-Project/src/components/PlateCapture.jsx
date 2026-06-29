import { useState, useRef } from "react";
import { normalizeIndianPlate } from "../lib/plate";
import { recognizePlate } from "../lib/anpr";
import LiveCameraCapture from "./LiveCameraCapture";

export default function PlateCapture({ onDetected, label }) {
  const [mode, setMode] = useState("live"); // live | manual
  const [photo, setPhoto] = useState(null); // dataURL
  const [status, setStatus] = useState("idle"); // idle | processing | done | error
  const fileInputRef = useRef(null);

  const handleFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      setPhoto(e.target.result);
      runRecognition(file, e.target.result);
    };
    reader.readAsDataURL(file);
  };

  // Sends the uploaded photo straight to the same /api/anpr proxy the live
  // camera uses (see src/lib/anpr.js) — Plate Recognizer's own model reads
  // the full uploaded image directly, so the manual-mode canvas cropping
  // and contrast-stretching preprocessing this used to do for Tesseract is
  // no longer needed; that work is now done server-side by Plate Recognizer.
  const runRecognition = async (file, dataUrl) => {
    setStatus("processing");
    try {
      const { plate: rawPlate } = await recognizePlate(file);
      const normalized = normalizeIndianPlate(rawPlate);
      if (!normalized) {
        setStatus("error");
        onDetected("", dataUrl);
        return;
      }
      setStatus("done");
      onDetected(normalized, dataUrl);
    } catch (err) {
      console.error("Manual upload recognition failed:", err);
      setStatus("error");
      onDetected("", dataUrl);
    }
  };

  const retake = () => {
    setPhoto(null);
    setStatus("idle");
    onDetected("", null);
  };

  const handleLiveDetected = (plateText, photoDataUrl) => {
    setPhoto(photoDataUrl);
    setStatus("done");
    onDetected(plateText, photoDataUrl);
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <label style={{ marginBottom: 0 }}>{label}</label>
        <ModeToggle
          mode={mode}
          onChange={(next) => {
            // Switching modes mid-capture should reset whatever the previous
            // mode had in progress, so a half-finished live scan doesn't
            // bleed into a stale manual-mode photo, or vice versa.
            setMode(next);
            retake();
          }}
        />
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: "none" }}
        onChange={(e) => handleFile(e.target.files[0])}
      />

      {mode === "live" && !photo && (
        <LiveCameraCapture
          onDetected={handleLiveDetected}
          onLiveRead={(plateText) => {
            onDetected(plateText, null);
          }}
        />
      )}

      {mode === "manual" && !photo && (
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
          <img src={photo} alt="Captured plate" style={{ width: "100%", display: "block", maxHeight: 180, objectFit: "cover" }} />
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

// Pill-style segmented toggle between "Live AI Camera" and "Manual Upload".
// Kept visually small/secondary since it's a fallback control, not the
// primary action — most operators should never need to touch it.
function ModeToggle({ mode, onChange }) {
  const options = [
    { key: "live", label: "Live AI Camera" },
    { key: "manual", label: "Manual Upload" },
  ];
  return (
    <div
      style={{
        display: "inline-flex",
        padding: 3,
        borderRadius: 9,
        background: "var(--surface-muted)",
        border: "1px solid var(--border)",
        gap: 2,
      }}
    >
      {options.map((opt) => {
        const active = mode === opt.key;
        return (
          <button
            key={opt.key}
            type="button"
            onClick={() => onChange(opt.key)}
            style={{
              padding: "5px 10px",
              fontSize: 11.5,
              fontWeight: 600,
              borderRadius: 6,
              border: "none",
              cursor: "pointer",
              background: active ? "var(--surface)" : "transparent",
              color: active ? "var(--accent)" : "var(--muted)",
              boxShadow: active ? "var(--shadow-sm)" : "none",
              transition: "background-color .15s ease, color .15s ease",
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
