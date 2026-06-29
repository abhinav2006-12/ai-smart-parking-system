import { useState } from "react";

const TYPES = ["standard", "ev", "disabled"];

export default function SettingsTab({ store, updateStore, onLogout }) {
  const [local, setLocal] = useState(() => JSON.parse(JSON.stringify(store.settings)));
  const [saved, setSaved] = useState(false);

  const setSlot = (type, val) =>
    setLocal((prev) => ({ ...prev, slotsByType: { ...prev.slotsByType, [type]: Math.max(0, Number(val) || 0) } }));

  const setRate = (type, field, val) =>
    setLocal((prev) => ({ ...prev, rates: { ...prev.rates, [type]: { ...prev.rates[type], [field]: Math.max(0, Number(val) || 0) } } }));

  const totalFromSlots = local.slotsByType.standard + local.slotsByType.ev + local.slotsByType.disabled;

  const save = () => {
    const next = { ...local, totalSlots: totalFromSlots };
    updateStore((prev) => ({ ...prev, settings: next }));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="fade-up" style={{ maxWidth: 680 }}>
      <div className="card" style={{ padding: "24px", boxShadow: "var(--shadow-sm)", marginBottom: 16 }}>
        <h3 className="display" style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>
          Parking Slots
        </h3>
        <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 16 }}>
          Set how many slots exist for each vehicle type. Total updates automatically.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
          {TYPES.map((type) => (
            <div key={type}>
              <label style={{ textTransform: "capitalize" }}>{type} slots</label>
              <input type="number" min="0" value={local.slotsByType[type]} onChange={(e) => setSlot(type, e.target.value)} />
            </div>
          ))}
        </div>
        <div style={{ marginTop: 14, fontSize: 13, color: "var(--muted)" }}>
          Total slots: <strong style={{ color: "var(--ink)" }}>{totalFromSlots}</strong>
        </div>
      </div>

      <div className="card" style={{ padding: "24px", boxShadow: "var(--shadow-sm)", marginBottom: 16 }}>
        <h3 className="display" style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>
          Hourly Fare by Vehicle Type
        </h3>
        <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 16 }}>
          Charged per hour (rounded up), with a minimum billable hours floor.
        </p>
        {TYPES.map((type) => (
          <div key={type} style={{ display: "grid", gridTemplateColumns: "100px 1fr 1fr", gap: 14, alignItems: "end", marginBottom: 14 }}>
            <div style={{ fontWeight: 700, fontSize: 14, textTransform: "capitalize", paddingBottom: 11 }}>{type}</div>
            <div>
              <label>Rate (₹/hr)</label>
              <input type="number" min="0" value={local.rates[type].hourly} onChange={(e) => setRate(type, "hourly", e.target.value)} />
            </div>
            <div>
              <label>Min. billable hours</label>
              <input type="number" min="1" value={local.rates[type].minHours} onChange={(e) => setRate(type, "minHours", e.target.value)} />
            </div>
          </div>
        ))}
      </div>

      <div className="card" style={{ padding: "24px", boxShadow: "var(--shadow-sm)", marginBottom: 16 }}>
        <h3 className="display" style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>
          UPI Payment Details
        </h3>
        <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 16 }}>Used to generate the QR code shown to guests at check-out.</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div>
            <label>UPI ID (VPA)</label>
            <input type="text" className="mono" value={local.upiVpa} onChange={(e) => setLocal((prev) => ({ ...prev, upiVpa: e.target.value }))} placeholder="yourname@upi" />
          </div>
          <div>
            <label>Payee Name</label>
            <input type="text" value={local.upiPayeeName} onChange={(e) => setLocal((prev) => ({ ...prev, upiPayeeName: e.target.value }))} />
          </div>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <button onClick={save} className="btn btn-primary">
          Save Settings
        </button>
        <button onClick={onLogout} className="btn btn-secondary">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M10 17l5-5-5-5" />
            <path d="M15 12H3" />
            <path d="M21 19V5a2 2 0 0 0-2-2h-5" />
            <path d="M14 21h5a2 2 0 0 0 2-2" />
          </svg>
          Log Out
        </button>
        {saved && <span style={{ color: "var(--success)", fontSize: 13, fontWeight: 600 }}>✓ Saved</span>}
      </div>
    </div>
  );
}
