import { useState } from "react";
import GuestMenu from "./GuestMenu";
import CheckInFlow from "./CheckInFlow";
import CheckOutFlow from "./CheckOutFlow";
import ThemeToggle from "./ThemeToggle";

export default function GuestPanel({ store, updateStore, onBack, theme, onToggleTheme }) {
  const [view, setView] = useState("menu"); // menu | checkin | checkout

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <GuestHeader
        onBack={view === "menu" ? onBack : () => setView("menu")}
        backLabel={view === "menu" ? "Home" : "Counter"}
        theme={theme}
        onToggleTheme={onToggleTheme}
      />
      <div style={{ flex: 1, padding: "24px 20px 60px" }}>
        {view === "menu" && <GuestMenu onCheckIn={() => setView("checkin")} onCheckOut={() => setView("checkout")} store={store} />}
        {view === "checkin" && <CheckInFlow store={store} updateStore={updateStore} onDone={() => setView("menu")} />}
        {view === "checkout" && <CheckOutFlow store={store} updateStore={updateStore} onDone={() => setView("menu")} />}
      </div>

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
        ParkPilot Gate Counter &copy; {new Date().getFullYear()} &bull; AI Smart Parking System &bull; Confirm plate details before submission
      </footer>
    </div>
  );
}

function GuestHeader({ onBack, backLabel, theme, onToggleTheme }) {
  return (
    <div style={{ borderBottom: "1px solid var(--border)", background: "var(--surface)", transition: "background-color 0.3s ease, border-bottom-color 0.3s ease, color 0.3s ease" }}>
      <div style={{ padding: "18px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 7,
                background: "linear-gradient(135deg, var(--accent), var(--accent-hover))",
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
            <span className="display" style={{ fontSize: 16, fontWeight: 600 }}>
              ParkPilot
            </span>
          </div>

          <div style={{ width: 1, height: 16, background: "var(--border)" }} />

          <button onClick={onBack} className="btn btn-ghost" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14, padding: "6px 10px" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 18l-6-6 6-6" />
            </svg>
            {backLabel}
          </button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ color: "var(--muted)", fontSize: 12.5 }}>Gate Counter</span>
          <ThemeToggle theme={theme} onToggle={onToggleTheme} />
        </div>
      </div>
    </div>
  );
}
