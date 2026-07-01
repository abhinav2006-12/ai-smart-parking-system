import { useState } from "react";
import DashboardTab from "./DashboardTab";
import VehicleListingTab from "./VehicleListingTab";
import SettingsTab from "./SettingsTab";
import ThemeToggle from "./ThemeToggle";

const TABS = [
  { key: "dashboard", label: "Dashboard" },
  { key: "vehicles", label: "Vehicle Listing" },
  { key: "settings", label: "Settings" },
];

export default function AdminPanel({ store, updateStore, onLogout, theme, onToggleTheme: toggleTheme, onRefresh }) {
  const [tab, setTab] = useState("dashboard");

  const changeTab = (nextTab) => {
    setTab(nextTab);
  };

  return (
    <div className="admin-container">
      {/* Sidebar - Always visible */}
      <aside className="admin-sidebar">
        {/* Sidebar Header: Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <img src="/parkpilot_transparent.png" alt="ParkPilot Logo" style={{ width: 28, height: 28, borderRadius: 7, objectFit: "contain" }} />
          <span className="display admin-sidebar-logo-text" style={{ fontWeight: 600 }}>
            ParkPilot Admin
          </span>
        </div>

        {/* Navigation tabs */}
        <nav className="admin-sidebar-nav">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => changeTab(t.key)}
              className="admin-nav-button"
              style={{
                background: tab === t.key ? "var(--bg)" : "transparent",
                border: "none",
                borderRadius: 8,
                color: tab === t.key ? "var(--ink)" : "var(--muted)",
                fontWeight: tab === t.key ? 600 : 500,
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              {t.label}
            </button>
          ))}
        </nav>

        {/* Actions: ThemeToggle + Logout */}
        <div className="admin-sidebar-actions">
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
          <button
            onClick={onLogout}
            className="btn btn-secondary admin-sidebar-logout"
          >
            Log Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="admin-content-area">
        <main
          style={{
            flex: 1,
            padding: "28px",
            maxWidth: 1280,
            margin: "0 auto",
            width: "100%",
          }}
        >
          {tab === "dashboard" && <DashboardTab store={store} onRefresh={onRefresh} />}
          {tab === "vehicles" && <VehicleListingTab store={store} onRefresh={onRefresh} />}
          {tab === "settings" && (
            <SettingsTab store={store} updateStore={updateStore} onLogout={onLogout} />
          )}
        </main>

        {/* Footer */}
        <footer
          style={{
            textAlign: "center",
            padding: "16px",
            color: "var(--muted)",
            fontSize: 12,
            borderTop: "1px solid var(--border)",
            background: "var(--surface)",
            transition: "background-color 0.3s ease, border-top-color 0.3s ease, color 0.3s ease",
          }}
        >
          ParkPilot Admin &copy; {new Date().getFullYear()} &bull; Secure AI-Assisted Smart Parking Control
        </footer>
      </div>
    </div>
  );
}
