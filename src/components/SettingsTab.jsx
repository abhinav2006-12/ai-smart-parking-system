import { useState, useEffect } from "react";
import { logActivity } from "../lib/activityLog";
import { CHANGELOG } from "../lib/changelog";

const TYPES = ["standard", "ev", "taxi"];

export default function SettingsTab({ store, updateStore, onLogout, adminUser }) {
  const [local, setLocal] = useState(() => JSON.parse(JSON.stringify(store.settings)));
  const [saved, setSaved] = useState(false);
  
  // Changelog UI state
  const [changelogSearch, setChangelogSearch] = useState("");
  const [expandedVersions, setExpandedVersions] = useState({ [CHANGELOG[0].version]: true }); // expand latest by default

  useEffect(() => {
    setLocal(JSON.parse(JSON.stringify(store.settings)));
  }, [store.settings]);

  const setSlot = (type, val) =>
    setLocal((prev) => ({ ...prev, slotsByType: { ...prev.slotsByType, [type]: Math.max(0, Number(val) || 0) } }));

  const setRate = (type, field, val) =>
    setLocal((prev) => ({ ...prev, rates: { ...prev.rates, [type]: { ...prev.rates[type], [field]: Math.max(0, Number(val) || 0) } } }));


  const totalFromSlots = local.slotsByType.standard + local.slotsByType.ev + local.slotsByType.taxi;

  const save = () => {
    const next = { ...local, totalSlots: totalFromSlots };
    updateStore((prev) => ({ ...prev, settings: next }));
    logActivity(adminUser, "Updated settings", {
      slots: `${next.slotsByType.standard} standard, ${next.slotsByType.ev} ev, ${next.slotsByType.taxi} taxi`,
      rates: `standard: ₹${next.rates?.standard?.hourly}/hr, ev: ₹${next.rates?.ev?.hourly}/hr, taxi: ₹${next.rates?.taxi?.hourly}/hr`
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
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
          {adminUser?.role === "head" && (
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
          )}



          {/* Card 5: System Updates & Changelog */}
          <div className="card" style={{ padding: "24px", boxShadow: "var(--shadow-sm)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
              <h3 className="display" style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>
                System Update Log
              </h3>
              <span className="changelog-total-badge">{CHANGELOG.length} releases</span>
            </div>
            <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 14 }}>
              Track new updates, features, and fixes across the ParkPilot system.
            </p>

            {/* Changelog Search */}
            <div style={{ position: "relative", marginBottom: 14 }}>
              <input
                type="text"
                placeholder="Search updates..."
                value={changelogSearch}
                onChange={(e) => setChangelogSearch(e.target.value)}
                style={{ fontSize: 13, padding: "8px 12px", width: "100%" }}
              />
            </div>

            {/* Updates list */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 380, overflowY: "auto", paddingRight: 4 }}>
              {CHANGELOG.filter(entry => {
                const search = changelogSearch.toLowerCase();
                return (
                  entry.version.toLowerCase().includes(search) ||
                  entry.title.toLowerCase().includes(search) ||
                  entry.items.some(item => item.toLowerCase().includes(search))
                );
              }).map((entry) => {
                const isExpanded = !!expandedVersions[entry.version];
                const tagColorClass = {
                  new: "changelog-badge-new",
                  improved: "changelog-badge-improved",
                  fix: "changelog-badge-fix",
                  security: "changelog-badge-security",
                }[entry.tag] || "changelog-badge-improved";

                return (
                  <div key={entry.version} className="changelog-item">
                    {/* Header trigger */}
                    <div
                      className="changelog-item-header"
                      onClick={() => setExpandedVersions(prev => ({ ...prev, [entry.version]: !prev[entry.version] }))}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0 }}>
                        <span className="changelog-version">{entry.version}</span>
                        <span className={`changelog-badge ${tagColorClass}`}>{entry.tag}</span>
                        <span className="changelog-title truncate">{entry.title}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                        <span className="changelog-date">{entry.date}</span>
                        <span className={`changelog-chevron ${isExpanded ? "rotated" : ""}`}>▼</span>
                      </div>
                    </div>

                    {/* Collapsible Body */}
                    {isExpanded && (
                      <div className="changelog-item-body fade-in">
                        <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12.5, lineHeight: 1.5, color: "var(--ink)", opacity: 0.9 }}>
                          {entry.items.map((item, idx) => (
                            <li key={idx} style={{ marginBottom: 6 }}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
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
