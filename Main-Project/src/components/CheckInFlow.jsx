import { useState, useMemo, useRef } from "react";
import PlateCapture from "./PlateCapture";
import { uid, fmtDateTime } from "../lib/format";
import { isLikelyValidIndianPlate, isStrictIndianPlate } from "../lib/plate";
import { PriceChartCard } from "./PriceChartOverlay";

const VEHICLE_TYPES = [
  { key: "standard", label: "Standard" },
  { key: "ev", label: "EV" },
  { key: "disabled", label: "Disabled" },
];

export default function CheckInFlow({ store, updateStore, onDone }) {
  const [vehicleType, setVehicleType] = useState("standard");
  const [plateNumber, setPlateNumber] = useState("");
  const [photo, setPhoto] = useState(null);
  const [submitted, setSubmitted] = useState(null);
  const [error, setError] = useState("");
  const [captureSessionId, setCaptureSessionId] = useState(0);
  const [autoCheckInSuccess, setAutoCheckInSuccess] = useState(null);
  const autoCheckInTimeoutRef = useRef(null);

  const handleEditCorrection = () => {
    if (autoCheckInTimeoutRef.current) {
      clearTimeout(autoCheckInTimeoutRef.current);
    }
    if (autoCheckInSuccess) {
      // Remove the newly created entry from the store
      updateStore((prev) => ({
        ...prev,
        vehicles: prev.vehicles.filter((v) => v.id !== autoCheckInSuccess.id),
      }));
      // Keep the scanned fields so the attendant can edit them manually
      setPlateNumber(autoCheckInSuccess.number);
      setPhoto(autoCheckInSuccess.entryPhoto);
    }
    setAutoCheckInSuccess(null);
  };

  const slotsByType = store.settings.slotsByType;
  const occupiedByType = useMemo(() => {
    const counts = { standard: 0, ev: 0, disabled: 0 };
    store.vehicles.filter((v) => v.status === "parked").forEach((v) => {
      counts[v.type] = (counts[v.type] || 0) + 1;
    });
    return counts;
  }, [store.vehicles]);

  const availableForType = (type) => Math.max(0, (slotsByType[type] || 0) - (occupiedByType[type] || 0));

  // Auto-detector: as soon as the field holds a fully-formed plate — whether
  // the camera just filled it or the operator typed it — check live whether
  // that vehicle is already parked. This is derived directly from render
  // state (no extra effect/state needed) so it updates the instant the plate
  // becomes valid, rather than waiting for the final Confirm click.
  const cleanLivePlate = plateNumber.trim().toUpperCase();
  const liveDuplicate =
    isStrictIndianPlate(cleanLivePlate) && store.vehicles.find((v) => v.number === cleanLivePlate && v.status === "parked");

  const handleSubmit = () => {
    const cleanPlate = plateNumber.trim().toUpperCase();
    if (!cleanPlate) {
      setError("Enter or confirm the vehicle number.");
      return;
    }
    if (availableForType(vehicleType) <= 0) {
      setError(`No ${vehicleType} slots available right now.`);
      return;
    }
    const alreadyParked = store.vehicles.find((v) => v.number === cleanPlate && v.status === "parked");
    if (alreadyParked) {
      setError("This vehicle is already checked in.");
      return;
    }

    const entry = {
      id: uid(),
      number: cleanPlate,
      type: vehicleType,
      entryTime: Date.now(),
      exitTime: null,
      status: "parked",
      fee: null,
      durationMins: null,
      entryPhoto: photo,
      exitPhoto: null,
    };
    updateStore((prev) => ({ ...prev, vehicles: [entry, ...prev.vehicles] }));
    setSubmitted(entry);
    setError("");
  };

  if (submitted) {
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
          Checked In
        </h2>
        <div className="mono" style={{ fontSize: 22, fontWeight: 600, marginTop: 14, letterSpacing: "0.02em", background: "var(--surface-muted)", padding: "10px 14px", borderRadius: 8 }}>
          {submitted.number}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 18, fontSize: 13.5, color: "var(--muted)" }}>
          <span>Type</span>
          <span style={{ color: "var(--ink)", fontWeight: 600, textTransform: "capitalize" }}>{submitted.type}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 13.5, color: "var(--muted)" }}>
          <span>Entry time</span>
          <span style={{ color: "var(--ink)", fontWeight: 600 }}>{fmtDateTime(submitted.entryTime)}</span>
        </div>
        <button onClick={onDone} className="btn btn-primary" style={{ width: "100%", marginTop: 24 }}>
          Done
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "center", gap: 22, flexWrap: "wrap", maxWidth: 1100, margin: "10px auto" }}>
      <div className="fade-up card" style={{ width: "100%", maxWidth: 460, padding: "28px 26px", boxShadow: "var(--shadow-sm)", position: "relative", overflow: "hidden" }}>
        {autoCheckInSuccess && (
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
                boxShadow: "0 20px 40px rgba(0,0,0,0.12)",
                border: "1px solid rgba(255,255,255,0.8)",
                background: "var(--surface)",
              }}
            >
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: "50%",
                  background: "var(--success-soft)",
                  color: "var(--success)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 16px",
                }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: "var(--ink)" }}>Auto Checked In</h3>
              <p style={{ fontSize: 13, color: "var(--muted)", margin: "4px 0 16px" }}>Vehicle successfully registered</p>
              
              <div className="mono" style={{ fontSize: 24, fontWeight: 700, letterSpacing: "0.03em", background: "var(--surface-muted)", padding: "12px 16px", borderRadius: 8, color: "var(--ink)", border: "1px solid var(--border)", marginBottom: 16 }}>
                {autoCheckInSuccess.number}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 13, color: "var(--muted)", borderTop: "1px solid var(--border)", paddingTop: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Vehicle Type</span>
                  <span style={{ color: "var(--ink)", fontWeight: 600, textTransform: "capitalize" }}>{autoCheckInSuccess.type}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Entry Time</span>
                  <span style={{ color: "var(--ink)", fontWeight: 600 }}>{fmtDateTime(autoCheckInSuccess.entryTime)}</span>
                </div>
              </div>

              <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 20, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                <span className="spin" style={{ width: 12, height: 12, border: "2px solid var(--border)", borderTopColor: "var(--success)", borderRadius: "50%", display: "inline-block" }}></span>
                <span>Resuming scanner in 10s...</span>
              </div>

              <div style={{ marginTop: 18, borderTop: "1px solid var(--border)", paddingTop: 14 }}>
                <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 8, fontStyle: "italic" }}>
                  Incorrect number? You can edit it manually.
                </div>
                <button
                  type="button"
                  onClick={handleEditCorrection}
                  className="btn btn-secondary"
                  style={{ width: "100%", padding: "6px 12px", fontSize: 12 }}
                >
                  Edit Manually
                </button>
              </div>
            </div>
          </div>
        )}

        <h2 className="display" style={{ fontSize: 18, fontWeight: 600 }}>
          Check-In
        </h2>
        <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 4 }}>Select type, capture the plate, confirm the number.</p>

        <div style={{ marginTop: 20 }}>
          <label>Vehicle Type</label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
            {VEHICLE_TYPES.map((t) => {
              const avail = availableForType(t.key);
              const active = vehicleType === t.key;
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setVehicleType(t.key)}
                  disabled={avail <= 0 && !active}
                  style={{
                    padding: "12px 6px",
                    borderRadius: "var(--radius-sm)",
                    border: active ? "1.5px solid var(--accent)" : "1px solid var(--border)",
                    background: active ? "var(--accent-soft)" : "var(--surface)",
                    textAlign: "center",
                    cursor: avail <= 0 ? "not-allowed" : "pointer",
                    opacity: avail <= 0 && !active ? 0.45 : 1,
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: 13.5 }}>{t.label}</div>
                  <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{avail} free</div>
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ marginTop: 18 }}>
          <PlateCapture
            key={captureSessionId}
            label="Vehicle Photo"
            onDetected={(text, photoData) => {
              setPlateNumber(text);
              setPhoto(photoData);

              // Automatically perform check-in if the plate is successfully detected (locked)
              if (photoData) {
                const cleanPlate = text.trim().toUpperCase();
                if (!cleanPlate) return;

                // Validate slots and existing status first
                if (availableForType(vehicleType) <= 0) {
                  setError(`No ${vehicleType} slots available right now.`);
                  return;
                }
                const alreadyParked = store.vehicles.find((v) => v.number === cleanPlate && v.status === "parked");
                if (alreadyParked) {
                  setError("This vehicle is already checked in.");
                  return;
                }

                // If check-in is valid, process it
                const entry = {
                  id: uid(),
                  number: cleanPlate,
                  type: vehicleType,
                  entryTime: Date.now(),
                  exitTime: null,
                  status: "parked",
                  fee: null,
                  durationMins: null,
                  entryPhoto: photoData,
                  exitPhoto: null,
                };
                updateStore((prev) => ({ ...prev, vehicles: [entry, ...prev.vehicles] }));
                setAutoCheckInSuccess(entry);
                setError("");

                // Dismiss overlay and restart scanning session after 10 seconds
                autoCheckInTimeoutRef.current = setTimeout(() => {
                  setAutoCheckInSuccess(null);
                  setPlateNumber("");
                  setPhoto(null);
                  setCaptureSessionId((id) => id + 1);
                }, 10000);
              }
            }}
          />
        </div>

        <div style={{ marginTop: 16 }}>
          <label>Vehicle Number (confirm / edit)</label>
          <input
            type="text"
            className="mono"
            value={plateNumber}
            onChange={(e) => setPlateNumber(e.target.value.toUpperCase())}
            placeholder="KL07AB1234"
            style={{ fontWeight: 600, letterSpacing: "0.02em" }}
          />
          {plateNumber && !isLikelyValidIndianPlate(plateNumber) && (
            <div style={{ fontSize: 12, color: "var(--warning)", marginTop: 6, fontWeight: 500 }}>
              Does not quite match the standard format - double check.
            </div>
          )}
          {liveDuplicate && (
            <div style={{ fontSize: 12, color: "var(--danger)", marginTop: 6, fontWeight: 600 }}>
              ⚠ Already checked in at {fmtDateTime(liveDuplicate.entryTime)} — this looks like a duplicate.
            </div>
          )}
        </div>

        <div style={{ marginTop: 14 }}>
          <label>Entry Time</label>
          <input type="text" value={fmtDateTime(Date.now())} disabled />
        </div>

        {error && <div style={{ color: "var(--danger)", fontSize: 13, fontWeight: 500, marginTop: 14 }}>{error}</div>}

        <button onClick={handleSubmit} disabled={!!liveDuplicate} className="btn btn-primary" style={{ width: "100%", marginTop: 22 }}>
          Confirm Check-In
        </button>
      </div>

      <div style={{ width: "100%", maxWidth: 580, flex: "1 1 360px" }}>
        <PriceChartCard inline />
      </div>
    </div>
  );
}
