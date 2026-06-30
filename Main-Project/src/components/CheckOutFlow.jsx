import { useState, useEffect, useRef } from "react";
import PlateCapture from "./PlateCapture";
import { uid, fmtMoney, fmtDateTime, formatDuration, durationMinutes, buildUpiUri } from "../lib/format";
import { isStrictIndianPlate } from "../lib/plate";

export default function CheckOutFlow({ store, updateStore, onDone }) {
  const [plateNumber, setPlateNumber] = useState("");
  const [photo, setPhoto] = useState(null);
  const [matched, setMatched] = useState(null);
  const [notFoundAlert, setNotFoundAlert] = useState(null); // { number }
  const [notFoundCountdown, setNotFoundCountdown] = useState(5);
  const [paid, setPaid] = useState(false);
  const [qrUrl, setQrUrl] = useState(null);

  // Bumped every time we want a genuinely fresh camera session
  const [captureSessionId, setCaptureSessionId] = useState(0);
  const notFoundIntervalRef = useRef(null);
  const lastAutoCheckedRef = useRef("");

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (notFoundIntervalRef.current) clearInterval(notFoundIntervalRef.current);
    };
  }, []);

  const resetScanner = () => {
    setPlateNumber("");
    setPhoto(null);
    setMatched(null);
    setNotFoundAlert(null);
    lastAutoCheckedRef.current = "";
    setCaptureSessionId((n) => n + 1);
  };

  const showNotFoundAlert = (plateNum) => {
    setNotFoundAlert({ number: plateNum });
    setNotFoundCountdown(5);
    if (notFoundIntervalRef.current) clearInterval(notFoundIntervalRef.current);
    let cd = 5;
    notFoundIntervalRef.current = setInterval(() => {
      cd -= 1;
      setNotFoundCountdown(cd);
      if (cd <= 0) {
        clearInterval(notFoundIntervalRef.current);
        notFoundIntervalRef.current = null;
        setNotFoundAlert(null);
        resetScanner();
      }
    }, 1000);
  };

  const tryMatch = (plate) => {
    const cleanPlate = plate.trim().toUpperCase();
    if (!cleanPlate) {
      setMatched(null);
      return;
    }
    const found = store.vehicles.find((v) => v.number === cleanPlate && v.status === "parked");
    if (found) {
      const now = Date.now();
      const mins = durationMinutes(found.entryTime, now);
      const rate = store.settings.rates[found.type] || store.settings.rates.standard;
      const hours = Math.max(rate.minHours, Math.ceil(mins / 60));
      const fee = hours * rate.hourly;
      setMatched({ ...found, exitTimePreview: now, durationMinsPreview: mins, hoursBilled: hours, feePreview: fee });
    } else {
      setMatched(null);
      showNotFoundAlert(cleanPlate);
    }
  };

  // Auto-detect: fires tryMatch as soon as a valid strict plate is in the field
  useEffect(() => {
    const clean = plateNumber.trim().toUpperCase();
    if (isStrictIndianPlate(clean) && clean !== lastAutoCheckedRef.current) {
      lastAutoCheckedRef.current = clean;
      tryMatch(clean);
    }
    if (!isStrictIndianPlate(clean)) {
      lastAutoCheckedRef.current = "";
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plateNumber]);

  // Generate QR code when a vehicle is matched
  useEffect(() => {
    if (matched && !paid) {
      import("qrcode").then(({ default: QRCode }) =>
        QRCode.toDataURL(buildUpiUri(store.settings, matched.feePreview, matched.number), { width: 240, margin: 1 })
          .then(setQrUrl)
          .catch(() => setQrUrl(null))
      );
    }
  }, [matched, paid, store.settings]);

  const completeCheckout = () => {
    updateStore((prev) => {
      const vehicles = prev.vehicles.map((v) => {
        if (v.id === matched.id) {
          return {
            ...v,
            status: "completed",
            exitTime: matched.exitTimePreview,
            durationMins: matched.durationMinsPreview,
            fee: matched.feePreview,
            exitPhoto: photo,
          };
        }
        return v;
      });
      const revenueLog = [
        ...prev.revenueLog,
        { id: uid(), vehicleId: matched.id, amount: matched.feePreview, date: matched.exitTimePreview },
      ];
      return { ...prev, vehicles, revenueLog };
    });
    setPaid(true);
  };

  // ── Payment success screen ──────────────────────────────────────────────
  if (paid) {
    return (
      <div className="fade-up card" style={{ maxWidth: 420, margin: "20px auto", padding: "30px 26px", textAlign: "center", boxShadow: "var(--shadow-sm)" }}>
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: "50%",
            background: "var(--success-soft)",
            color: "var(--success)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto",
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="display" style={{ fontSize: 19, fontWeight: 600, marginTop: 16 }}>
          Checked Out
        </h2>
        <div className="mono" style={{ fontSize: 20, fontWeight: 600, marginTop: 14, background: "var(--surface-muted)", padding: "10px 14px", borderRadius: 8 }}>
          {matched.number}
        </div>
        <div style={{ fontSize: 28, fontWeight: 700, marginTop: 16, color: "var(--success)" }}>{fmtMoney(matched.feePreview)}</div>
        <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 4 }}>
          Duration: {formatDuration(matched.durationMinsPreview)} · billed {matched.hoursBilled} hr
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
          <button
            onClick={() => {
              setPlateNumber("");
              setPhoto(null);
              setMatched(null);
              setNotFoundAlert(null);
              setPaid(false);
              setQrUrl(null);
              lastAutoCheckedRef.current = "";
              setCaptureSessionId((n) => n + 1);
            }}
            className="btn btn-secondary"
            style={{ flex: 1 }}
          >
            Scan Next Vehicle
          </button>
          <button onClick={onDone} className="btn btn-primary" style={{ flex: 1 }}>
            Done
          </button>
        </div>
      </div>
    );
  }

  // ── Main check-out form ─────────────────────────────────────────────────
  return (
    <div
      className="fade-up card"
      style={{ maxWidth: 460, margin: "10px auto", padding: "28px 26px", boxShadow: "var(--shadow-sm)", position: "relative", overflow: "hidden" }}
    >
      {/* ── Vehicle Not Found Alert Modal ── */}
      {notFoundAlert && (
        <div
          className="animate-fade-in"
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(255, 255, 255, 0.4)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
          }}
        >
          <div
            className="card animate-scale-up"
            style={{
              width: "90%",
              maxWidth: 360,
              padding: "30px 24px",
              textAlign: "center",
              boxShadow: "0 20px 40px rgba(0,0,0,0.15)",
              border: "1.5px solid var(--danger)",
              background: "var(--surface)",
            }}
          >
            {/* Icon */}
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: "50%",
                background: "var(--danger-soft, #fef2f2)",
                color: "var(--danger)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px",
                fontSize: 26,
              }}
            >
              🔍
            </div>

            <h3 style={{ fontSize: 17, fontWeight: 700, margin: 0, color: "var(--danger)" }}>Vehicle Not Found</h3>
            <p style={{ fontSize: 13, color: "var(--muted)", margin: "6px 0 16px" }}>
              No parked vehicle found with that number. Check the plate or search it up in Admin.
            </p>

            {/* Scanned plate */}
            <div
              className="mono"
              style={{
                fontSize: 24,
                fontWeight: 700,
                letterSpacing: "0.03em",
                background: "var(--danger-soft, #fef2f2)",
                padding: "12px 16px",
                borderRadius: 8,
                color: "var(--danger)",
                border: "1px solid var(--danger)",
                marginBottom: 16,
              }}
            >
              {notFoundAlert.number}
            </div>

            {/* Countdown */}
            <div style={{ fontSize: 11.5, color: "var(--muted)", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
              <span
                className="spin"
                style={{
                  width: 12,
                  height: 12,
                  border: "2px solid var(--border)",
                  borderTopColor: "var(--danger)",
                  borderRadius: "50%",
                  display: "inline-block",
                }}
              />
              <span>
                Resuming scanner in{" "}
                <span
                  key={notFoundCountdown}
                  className="animate-scale-up"
                  style={{ display: "inline-block", fontWeight: 700, color: "var(--danger)", minWidth: "16px", textAlign: "center" }}
                >
                  {notFoundCountdown}
                </span>
                s...
              </span>
            </div>

            {/* Manual dismiss */}
            <button
              type="button"
              onClick={() => {
                if (notFoundIntervalRef.current) {
                  clearInterval(notFoundIntervalRef.current);
                  notFoundIntervalRef.current = null;
                }
                setNotFoundAlert(null);
                resetScanner();
              }}
              className="btn btn-secondary"
              style={{ width: "100%", marginTop: 16, padding: "7px 12px", fontSize: 13 }}
            >
              Dismiss & Scan Again
            </button>
          </div>
        </div>
      )}

      <h2 className="display" style={{ fontSize: 18, fontWeight: 600 }}>
        Check-Out
      </h2>
      <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 4 }}>Capture or type the plate — we'll look it up automatically.</p>

      <div style={{ marginTop: 18 }}>
        <PlateCapture
          key={captureSessionId}
          label="Vehicle Photo"
          onDetected={(text, photoData) => {
            setPlateNumber(text);
            setPhoto(photoData);
            if (photoData) {
              tryMatch(text);
            }
          }}
        />
      </div>

      <div style={{ marginTop: 16 }}>
        <label>Vehicle Number (confirm / edit)</label>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            type="text"
            className="mono"
            value={plateNumber}
            onChange={(e) => setPlateNumber(e.target.value.toUpperCase())}
            placeholder="KL07AB1234"
            style={{ fontWeight: 600, letterSpacing: "0.02em" }}
          />
          <button type="button" onClick={() => tryMatch(plateNumber)} className="btn btn-secondary" style={{ flexShrink: 0 }}>
            Find
          </button>
        </div>
      </div>

      {matched && (
        <div className="fade-up" style={{ marginTop: 20, borderTop: "1px solid var(--border)", paddingTop: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5 }}>
            <span style={{ color: "var(--muted)" }}>Entry time</span>
            <span style={{ fontWeight: 600 }}>{fmtDateTime(matched.entryTime)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5, marginTop: 8 }}>
            <span style={{ color: "var(--muted)" }}>Exit time</span>
            <span style={{ fontWeight: 600 }}>{fmtDateTime(matched.exitTimePreview)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5, marginTop: 8 }}>
            <span style={{ color: "var(--muted)" }}>Duration</span>
            <span style={{ fontWeight: 600 }}>{formatDuration(matched.durationMinsPreview)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5, marginTop: 8 }}>
            <span style={{ color: "var(--muted)" }}>Rate ({matched.type})</span>
            <span style={{ fontWeight: 600 }}>
              {fmtMoney((store.settings.rates[matched.type] || store.settings.rates.standard).hourly)}/hr · billed {matched.hoursBilled} hr
            </span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--border)" }}>
            <span style={{ fontWeight: 600, fontSize: 15 }}>Total Fee</span>
            <span style={{ fontWeight: 700, fontSize: 22, color: "var(--success)" }}>{fmtMoney(matched.feePreview)}</span>
          </div>

          {qrUrl && (
            <div style={{ textAlign: "center", marginTop: 18, padding: "16px", background: "var(--surface-muted)", borderRadius: "var(--radius-sm)" }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", letterSpacing: ".02em", marginBottom: 10 }}>SCAN TO PAY VIA UPI</div>
              <img src={qrUrl} alt="UPI payment QR code" style={{ width: 160, height: 160, borderRadius: 8, background: "#fff", padding: 8 }} />
              <div className="mono" style={{ fontSize: 12, color: "var(--muted)", marginTop: 8 }}>
                {store.settings.upiVpa}
              </div>
            </div>
          )}

          <button onClick={completeCheckout} className="btn btn-primary" style={{ width: "100%", marginTop: 18 }}>
            Simulate Payment Success
          </button>
        </div>
      )}
    </div>
  );
}
