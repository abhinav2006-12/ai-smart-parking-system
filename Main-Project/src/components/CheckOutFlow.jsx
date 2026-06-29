import { useState, useEffect, useRef } from "react";
import PlateCapture from "./PlateCapture";
import { uid, fmtMoney, fmtDateTime, formatDuration, durationMinutes, buildUpiUri } from "../lib/format";
import { isStrictIndianPlate } from "../lib/plate";

export default function CheckOutFlow({ store, updateStore, onDone }) {
  const [plateNumber, setPlateNumber] = useState("");
  const [photo, setPhoto] = useState(null);
  const [matched, setMatched] = useState(null);
  const [notFoundMsg, setNotFoundMsg] = useState("");
  const [paid, setPaid] = useState(false);
  const [qrUrl, setQrUrl] = useState(null);

  // Bumped every time we want a genuinely fresh camera session (not just
  // cleared text). React only tears down and remounts a component when its
  // `key` changes — without this, resetting plateNumber/photo back to
  // empty would NOT reset LiveCameraCapture's internal vote buffer or
  // locked-plate state, since the component instance itself never unmounts.
  const [captureSessionId, setCaptureSessionId] = useState(0);

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
      setNotFoundMsg("");
    } else {
      setMatched(null);
      setNotFoundMsg("No parked vehicle found with that number. Check the plate or search it up in Admin.");
    }
  };

  // Tracks the last plate string we already auto-triggered a lookup for, so
  // we don't re-fire tryMatch on every keystroke/render once a plate has
  // settled — only when the *value itself* changes to a new valid plate.
  const lastAutoCheckedRef = useRef("");

  // Auto-detector: the moment the field holds a strict, fully-formed Indian
  // plate (10 chars, SS NN LLL NNNN) — whether it got there by the camera
  // auto-filling it or the operator typing/editing it by hand — we
  // automatically look the vehicle up. No manual "Find" click required.
  // Loosely-formatted/partial plates are left alone: we don't want to spam
  // lookups mid-keystroke while someone is still typing.
  useEffect(() => {
    const clean = plateNumber.trim().toUpperCase();
    if (isStrictIndianPlate(clean) && clean !== lastAutoCheckedRef.current) {
      lastAutoCheckedRef.current = clean;
      tryMatch(clean);
    }
    // Clears the "already checked" memo once the field is emptied/edited
    // back down below the strict length, so re-entering the same plate
    // later (e.g. after a Retake) still triggers a fresh lookup.
    if (!isStrictIndianPlate(clean)) {
      lastAutoCheckedRef.current = "";
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- tryMatch reads `store`/`matched` via closure each render; re-running on plateNumber alone is intentional
  }, [plateNumber]);

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
      const revenueLog = [...prev.revenueLog, { id: uid(), vehicleId: matched.id, amount: matched.feePreview, date: matched.exitTimePreview }];
      return { ...prev, vehicles, revenueLog };
    });
    setPaid(true);
  };

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
              // Resets every piece of local state back to a blank slate —
              // this is what "resets the live camera for the next vehicle"
              // means in practice: PlateCapture/LiveCameraCapture re-mount
              // fresh (their internal vote buffer + photo state start over)
              // because plateNumber/photo going back to null/"" makes the
              // capture flow render as if newly opened.
              setPlateNumber("");
              setPhoto(null);
              setMatched(null);
              setNotFoundMsg("");
              setPaid(false);
              setQrUrl(null);
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

  return (
    <div className="fade-up card" style={{ maxWidth: 460, margin: "10px auto", padding: "28px 26px", boxShadow: "var(--shadow-sm)" }}>
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

      {notFoundMsg && <div style={{ color: "var(--danger)", fontSize: 13, fontWeight: 500, marginTop: 14 }}>{notFoundMsg}</div>}

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
              {fmtMoney(store.settings.rates[matched.type].hourly)}/hr · billed {matched.hoursBilled} hr
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
