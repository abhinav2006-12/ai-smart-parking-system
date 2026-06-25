export default function HomeScreen({ onAdmin, onGuest }) {
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
          <span className="display" style={{ fontSize: 16, fontWeight: 600 }}>
            ParkPilot
          </span>
        </div>
        <span style={{ color: "var(--muted)", fontSize: 12.5 }}>AI Smart Parking System</span>
      </div>

      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 20px" }}>
        <div className="fade-up" style={{ maxWidth: 760, width: "100%" }}>
          <h1
            className="display"
            style={{
              fontSize: "clamp(28px,4vw,42px)",
              fontWeight: 700,
              lineHeight: 1.15,
              textAlign: "center",
            }}
          >
            Parking, organized.
          </h1>
          <p
            style={{
              color: "var(--muted)",
              fontSize: 15,
              marginTop: 12,
              textAlign: "center",
              maxWidth: 480,
              marginLeft: "auto",
              marginRight: "auto",
              lineHeight: 1.6,
            }}
          >
            Check vehicles in and out with a photo, auto-detect the number plate, and track occupancy and revenue from one dashboard.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 36 }}>
            <button onClick={onGuest} className="card" style={{ textAlign: "left", padding: "24px", cursor: "pointer", boxShadow: "var(--shadow-sm)" }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--accent)", letterSpacing: ".02em" }}>GATE COUNTER</div>
              <h2 className="display" style={{ fontSize: 20, marginTop: 8, fontWeight: 600 }}>
                Guest / Guard
              </h2>
              <p style={{ color: "var(--muted)", fontSize: 13.5, marginTop: 6, lineHeight: 1.5 }}>Check a vehicle in or out. No login needed.</p>
              <div style={{ marginTop: 16, fontSize: 13, fontWeight: 600, color: "var(--accent)" }}>Open counter →</div>
            </button>

            <button onClick={onAdmin} className="card" style={{ textAlign: "left", padding: "24px", cursor: "pointer", boxShadow: "var(--shadow-sm)" }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", letterSpacing: ".02em" }}>BACK OFFICE</div>
              <h2 className="display" style={{ fontSize: 20, marginTop: 8, fontWeight: 600 }}>
                Admin
              </h2>
              <p style={{ color: "var(--muted)", fontSize: 13.5, marginTop: 6, lineHeight: 1.5 }}>Dashboard, fares, vehicle logs, revenue.</p>
              <div style={{ marginTop: 16, fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>Login →</div>
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
