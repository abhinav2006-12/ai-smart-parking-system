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
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const changeTab = (nextTab) => {
    setTab(nextTab);
    setSidebarOpen(false);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg)",
        transition: "background-color 0.3s ease, color 0.3s ease",
      }}
    >
      <button
        type="button"
        onClick={() => setSidebarOpen(true)}
        aria-label="Open sidebar"
        className="btn btn-secondary"
        style={{
          position: "fixed",
          top: 18,
          left: 18,
          zIndex: 20,
          width: 38,
          height: 38,
          padding: 0,
          fontSize: 20,
          lineHeight: 1,
        }}
      >
        ...
      </button>

      {sidebarOpen && (
        <button
          type="button"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close sidebar overlay"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 25,
            border: "none",
            background: "rgba(15, 18, 22, 0.35)",
          }}
        />
      )}

      <aside
        style={{
          width: 240,
          minHeight: "100vh",
          padding: "20px 16px",
          borderRight: "1px solid var(--border)",
          background: "var(--surface)",
          display: "flex",
          flexDirection: "column",
          gap: 24,
          position: "fixed",
          inset: "0 auto 0 0",
          zIndex: 30,
          transform: sidebarOpen ? "translateX(0)" : "translateX(-100%)",
          transition: "transform .2s ease, background-color 0.3s ease, border-right-color 0.3s ease, color 0.3s ease",
          boxShadow: sidebarOpen ? "var(--shadow-md)" : "none",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: 7,
                background: "var(--accent)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
                color: "#fff",
                fontSize: 13,
              }}
            >
              P
            </div>

            <span className="display" style={{ fontSize: 15, fontWeight: 600 }}>
              ParkPilot Admin
            </span>
          </div>

          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close sidebar"
            className="btn btn-ghost"
            style={{ width: 30, height: 30, padding: 0, fontSize: 18 }}
          >
            x
          </button>
        </div>

        <nav style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => changeTab(t.key)}
              style={{
                width: "100%",
                textAlign: "left",
                background: tab === t.key ? "var(--bg)" : "transparent",
                border: "none",
                borderRadius: 8,
                color: tab === t.key ? "var(--ink)" : "var(--muted)",
                fontSize: 14,
                fontWeight: tab === t.key ? 600 : 500,
                padding: "10px 12px",
                cursor: "pointer",
              }}
            >
              {t.label}
            </button>
          ))}
        </nav>

        <button
          onClick={onLogout}
          className="btn btn-secondary"
          style={{
            marginTop: "auto",
            fontSize: 13,
            padding: "9px 14px",
            width: "100%",
          }}
        >
          Log Out
        </button>
      </aside>

      <main
        style={{
          flex: 1,
          padding: "28px",
          maxWidth: 1280,
          margin: "0 auto",
          width: "100%",
        }}
      >
        {tab === "dashboard" && <DashboardTab store={store} />}
        {tab === "vehicles" && <VehicleListingTab store={store} />}
        {tab === "settings" && (
          <SettingsTab store={store} updateStore={updateStore} onLogout={onLogout} />
        )}
      </main>
    </div>
  );
}
