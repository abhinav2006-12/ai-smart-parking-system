import ThemeToggle from "./ThemeToggle";

export default function HomeScreen({ onGuest, theme, onToggleTheme }) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <div
        style={{
          padding: "20px 32px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid var(--border)",
        }}
      >
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
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ color: "var(--muted)", fontSize: 12.5 }}>AI Smart Parking System</span>
          <ThemeToggle theme={theme} onToggle={onToggleTheme} />
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 20px" }}>
        <div className="fade-up" style={{ maxWidth: 560, width: "100%" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "5px 12px",
              borderRadius: 20,
              background: "var(--accent-soft)",
              color: "var(--accent)",
              fontSize: 12,
              fontWeight: 600,
              margin: "0 auto 18px",
            }}
            className="badge-row"
          >
            <span className="pulse" style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent)", display: "inline-block" }} />
            Live gate counter
          </div>

          <h1
            className="display"
            style={{
              fontSize: "clamp(30px,4.5vw,46px)",
              fontWeight: 700,
              lineHeight: 1.12,
              textAlign: "center",
            }}
          >
            Parking, organized.
          </h1>
          <p
            style={{
              color: "var(--muted)",
              fontSize: 15.5,
              marginTop: 14,
              textAlign: "center",
              maxWidth: 460,
              marginLeft: "auto",
              marginRight: "auto",
              lineHeight: 1.65,
            }}
          >
            Check vehicles in and out with a photo, auto-detect the number plate, and pay instantly with a UPI QR code.
          </p>

          <div style={{ marginTop: 40, display: "flex", justifyContent: "center" }}>
            <button
              onClick={onGuest}
              className="card card-hover btn-primary"
              style={{
                textAlign: "center",
                padding: "20px 40px",
                cursor: "pointer",
                boxShadow: "var(--shadow-md)",
                border: "none",
                color: "#fff",
                background: "linear-gradient(135deg, var(--accent), var(--accent-hover))",
                display: "inline-flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 5v14M5 12h14" />
              </svg>
              <span>
                <span className="display" style={{ fontSize: 16, fontWeight: 600, display: "block" }}>
                  Open Gate Counter
                </span>
                <span style={{ fontSize: 12.5, opacity: 0.85 }}>Check a vehicle in or out — no login needed</span>
              </span>
            </button>
          </div>
        </div>
      </div>

      <div style={{ textAlign: "center", padding: "16px", color: "var(--muted)", fontSize: 12, borderTop: "1px solid var(--border)" }}>
        Plate detection is AI-assisted — always confirm the number before submitting.
      </div>
    </div>
  );
}
