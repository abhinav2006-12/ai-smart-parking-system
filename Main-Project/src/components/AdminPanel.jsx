import { useState, useEffect } from "react";
import DashboardTab from "./DashboardTab";
import VehicleListingTab from "./VehicleListingTab";
import SettingsTab from "./SettingsTab";
import AdminAccountsTab from "./AdminAccountsTab";
import ActivityLogTab from "./ActivityLogTab";
import ThemeToggle from "./ThemeToggle";

export default function AdminPanel({ store, updateStore, onLogout, theme, onToggleTheme: toggleTheme, onRefresh, adminUser }) {
  const [tab, setTab] = useState("dashboard");

  const availableTabs = [
    { key: "dashboard", label: "Dashboard" },
    { key: "vehicles", label: "Vehicle Listing" },
    (adminUser?.role === "head" || adminUser?.role === "gate_manager") && { key: "settings", label: "Settings" },
    adminUser?.role === "head" && { key: "accounts", label: "Accounts" },
    adminUser?.role === "head" && { key: "activity", label: "Activity Log" },
  ].filter(Boolean);

  // If role changes or tab becomes unavailable, fall back to dashboard
  useEffect(() => {
    if (!availableTabs.some((t) => t.key === tab)) {
      setTab("dashboard");
    }
  }, [adminUser, tab, availableTabs]);

  const changeTab = (nextTab) => {
    setTab(nextTab);
  };

  return (
    <div className="admin-container">
      {/* Sidebar - Always visible */}
      <aside className="admin-sidebar" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {/* Sidebar Header: Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <img src={theme === "dark" ? "/parkpilot_darktheme.png" : "/parkpilot_lighttheme.png"} alt="ParkPilot Logo" style={{ width: 28, height: 28, borderRadius: 7, objectFit: "contain" }} />
            <span className="display admin-sidebar-logo-text" style={{ fontWeight: 600 }}>
              ParkPilot Admin
            </span>
          </div>

          {/* Navigation tabs */}
          <nav className="admin-sidebar-nav">
            {availableTabs.map((t) => (
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
                  textAlign: "left",
                  padding: "10px 14px",
                  width: "100%",
                }}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </div>

        <div>
          {/* User Info Profile Badge */}
          {adminUser && (
            <div style={{
              padding: "12px 14px",
              background: "var(--surface-muted)",
              borderRadius: 10,
              border: "1px solid var(--border)",
              marginBottom: 14,
              display: "flex",
              flexDirection: "column",
              gap: 4
            }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {adminUser.name}
              </div>
              <div style={{ display: "flex" }}>
                <span style={{
                  fontSize: 10, fontWeight: 700, letterSpacing: ".04em",
                  padding: "2px 8px", borderRadius: 12,
                  background: adminUser.role === "head" ? "rgba(99,102,241,0.15)" : adminUser.role === "gate_manager" ? "rgba(14,165,233,0.15)" : "rgba(16,185,129,0.15)",
                  color: adminUser.role === "head" ? "#6366F1" : adminUser.role === "gate_manager" ? "#0EA5E9" : "#10B981",
                }}>
                  {adminUser.role === "head" ? "Head Admin" : adminUser.role === "gate_manager" ? "Gate Manager" : "Security"}
                </span>
              </div>
            </div>
          )}

          {/* Actions: ThemeToggle + Logout */}
          <div className="admin-sidebar-actions" style={{ borderTop: "1px solid var(--border)", paddingTop: 14 }}>
            <ThemeToggle theme={theme} onToggle={toggleTheme} />
            <button
              onClick={onLogout}
              className="btn btn-secondary admin-sidebar-logout"
              style={{ marginTop: 10 }}
            >
              Log Out
            </button>
          </div>
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
            <SettingsTab store={store} updateStore={updateStore} onLogout={onLogout} adminUser={adminUser} />
          )}
          {tab === "accounts" && adminUser?.role === "head" && (
            <AdminAccountsTab adminUser={adminUser} />
          )}
          {tab === "activity" && adminUser?.role === "head" && (
            <ActivityLogTab />
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
