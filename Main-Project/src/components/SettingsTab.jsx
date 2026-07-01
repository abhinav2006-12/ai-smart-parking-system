import { useState, useEffect } from "react";
import { wipeAllData } from "../lib/supabase";

const TYPES = ["standard", "ev", "taxi"];

export default function SettingsTab({ store, updateStore, onLogout }) {
  const [local, setLocal] = useState(() => JSON.parse(JSON.stringify(store.settings)));
  const [saved, setSaved] = useState(false);
  const [wiping, setWiping] = useState(false);

  useEffect(() => {
    setLocal(JSON.parse(JSON.stringify(store.settings)));
  }, [store.settings]);

  const setSlot = (type, val) =>
    setLocal((prev) => ({ ...prev, slotsByType: { ...prev.slotsByType, [type]: Math.max(0, Number(val) || 0) } }));

  const setRate = (type, field, val) =>
    setLocal((prev) => ({ ...prev, rates: { ...prev.rates, [type]: { ...prev.rates[type], [field]: Math.max(0, Number(val) || 0) } } }));

  const setPeakHourSetting = (field, val) => {
    setLocal((prev) => {
      const currentRates = prev.rates || {};
      const currentPeak = currentRates.peakHours || { start: "17:00", end: "21:00", multiplier: 1.5, enabled: true };
      return {
        ...prev,
        rates: {
          ...currentRates,
          peakHours: {
            ...currentPeak,
            [field]: field === "enabled" ? val : (field === "multiplier" ? (Math.max(1, Number(val) || 1)) : val)
          }
        }
      };
    });
  };

  const totalFromSlots = local.slotsByType.standard + local.slotsByType.ev + local.slotsByType.taxi;

  const save = () => {
    const next = { ...local, totalSlots: totalFromSlots };
    updateStore((prev) => ({ ...prev, settings: next }));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleWipeData = async () => {
    const confirm1 = window.confirm(
      "WARNING: You are about to wipe the entire database.\n\n" +
      "This will permanently delete all vehicle transaction logs and revenue records.\n\n" +
      "Do you want to continue?"
    );
    if (!confirm1) return;

    const confirm2 = window.confirm(
      "CRITICAL WARNING: This action is permanent and CANNOT be undone.\n\n" +
      "Are you absolutely certain you want to proceed with clearing all system logs?"
    );
    if (!confirm2) return;

    const password = window.prompt("Enter the database administrator password to confirm data wipe:");
    if (password === null) return;

    if (password !== "parkdatabase") {
      alert("Incorrect password. Database wipe aborted.");
      return;
    }

    setWiping(true);
    try {
      // First wipe Supabase directly so data doesn't reload on refresh
      await wipeAllData();
      // Then clear the local React store + localStorage
      updateStore((prev) => ({ ...prev, vehicles: [], revenueLog: [] }));
      alert("Database wiped successfully! All vehicle and revenue logs have been deleted.");
    } catch (err) {
      console.error("Wipe failed:", err);
      alert("Wipe failed: " + (err?.message || "Unknown error. Check console for details."));
    } finally {
      setWiping(false);
    }
  };

  return (
    <div className="fade-up" style={{ display: "flex", flexDirection: "column", gap: 20, width: "100%" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(450px, 1fr))", gap: 20 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Card 1: Parking Slots */}
          <div className="card" style={{ padding: "24px", boxShadow: "var(--shadow-sm)" }}>
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

          {/* Card 2: Hourly Fare */}
          <div className="card" style={{ padding: "24px", boxShadow: "var(--shadow-sm)" }}>
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
                  <input type="number" min="0" value={(local.rates[type] || { hourly: 0 }).hourly} onChange={(e) => setRate(type, "hourly", e.target.value)} />
                </div>
                <div>
                  <label>Min. billable hours</label>
                  <input type="number" min="1" value={(local.rates[type] || { minHours: 1 }).minHours} onChange={(e) => setRate(type, "minHours", e.target.value)} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Card 3: UPI Payment Details */}
          <div className="card" style={{ padding: "24px", boxShadow: "var(--shadow-sm)" }}>
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

          {/* Card 5: Peak Hour Settings */}
          <div className="card" style={{ padding: "24px", boxShadow: "var(--shadow-sm)" }}>
            <h3 className="display" style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>
              Peak Hour Pricing
            </h3>
            <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 16 }}>
              Apply a rate multiplier during busy hours of the day.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <input
                  type="checkbox"
                  id="peak-hours-enabled"
                  checked={local.rates?.peakHours?.enabled ?? true}
                  onChange={(e) => setPeakHourSetting("enabled", e.target.checked)}
                  style={{ width: "auto", margin: 0 }}
                />
                <label htmlFor="peak-hours-enabled" style={{ marginBottom: 0, fontWeight: 600, cursor: "pointer" }}>
                  Enable Peak Hour Multiplier
                </label>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div>
                  <label>Start Time</label>
                  <input
                    type="time"
                    value={local.rates?.peakHours?.start ?? "17:00"}
                    onChange={(e) => setPeakHourSetting("start", e.target.value)}
                    disabled={!(local.rates?.peakHours?.enabled ?? true)}
                  />
                </div>
                <div>
                  <label>End Time</label>
                  <input
                    type="time"
                    value={local.rates?.peakHours?.end ?? "21:00"}
                    onChange={(e) => setPeakHourSetting("end", e.target.value)}
                    disabled={!(local.rates?.peakHours?.enabled ?? true)}
                  />
                </div>
              </div>
              <div>
                <label>Peak Multiplier (e.g. 1.5 for 150%)</label>
                <input
                  type="number"
                  step="0.1"
                  min="1"
                  value={local.rates?.peakHours?.multiplier ?? 1.5}
                  onChange={(e) => setPeakHourSetting("multiplier", e.target.value)}
                  disabled={!(local.rates?.peakHours?.enabled ?? true)}
                />
              </div>
            </div>
          </div>

          {/* Card 4: Danger Zone (Wipe Data) */}
          <div className="card" style={{ padding: "24px", boxShadow: "var(--shadow-sm)", border: "1px solid var(--danger-soft)" }}>
            <h3 className="display" style={{ fontSize: 16, fontWeight: 600, color: "var(--danger)", marginBottom: 4 }}>
              Danger Zone
            </h3>
            <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 16 }}>
              Permanently delete all vehicle transaction logs and revenue records from the database.
            </p>
            <button onClick={handleWipeData} disabled={wiping} className="btn btn-danger" style={{ width: "100%", justifyContent: "center" }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ marginRight: 6 }}>
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                <line x1="10" y1="11" x2="10" y2="17"></line>
                <line x1="14" y1="11" x2="14" y2="17"></line>
              </svg>
              {wiping ? "Wiping…" : "Wipe Database Data"}
            </button>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 10 }}>
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
