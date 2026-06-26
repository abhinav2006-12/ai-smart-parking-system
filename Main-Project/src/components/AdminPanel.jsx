import { useState } from "react";
import DashboardTab from "./DashboardTab";
import VehicleListingTab from "./VehicleListingTab";
import SettingsTab from "./SettingsTab";

const TABS = [
  { key: "dashboard", label: "Dashboard" },
  { key: "vehicles", label: "Vehicle Listing" },
  { key: "settings", label: "Settings" },
];

export default function AdminPanel({ store, updateStore, onLogout }) {
  const [tab, setTab] = useState("dashboard");

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <div
        style={{
          padding: "16px 28px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
          borderBottom: "1px solid var(--border)",
          background: "var(--surface)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 26,
              height: 26,
              borderRadius: 7,
              background: "var(--accent)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 700,
              color: "#fff",
              fontSize: 12,
            }}
          >
            P
          </div>
          <span className="display" style={{ fontSize: 15, fontWeight: 600 }}>
            ParkPilot Admin
          </span>
        </div>
        <div style={{ display: "flex", gap: 24 }}>
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={"tab-underline" + (tab === t.key ? " active" : "")}
              style={{ background: "transparent", border: "none", color: tab === t.key ? "var(--ink)" : "var(--muted)", fontSize: 14, fontWeight: 500, padding: "6px 0" }}
            >
              {t.label}
            </button>
          ))}
        </div>
        <button onClick={onLogout} className="btn btn-secondary" style={{ fontSize: 13, padding: "8px 14px" }}>
          Log Out
        </button>
      </div>

      <div style={{ padding: "28px", maxWidth: 1280, margin: "0 auto" }}>
        {tab === "dashboard" && <DashboardTab store={store} />}
        {tab === "vehicles" && <VehicleListingTab store={store} />}
        {tab === "settings" && <SettingsTab store={store} updateStore={updateStore} />}
      </div>
    </div>
  );
}
