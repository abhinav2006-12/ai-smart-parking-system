export default function GuestMenu({ onCheckIn, onCheckOut, store }) {
  const activeCount = store.vehicles.filter((v) => v.status === "parked").length;

  return (
    <div className="fade-up" style={{ maxWidth: 520, margin: "30px auto 0" }}>
      <h1 className="display" style={{ fontSize: 24, fontWeight: 600, textAlign: "center" }}>
        Welcome
      </h1>
      <p style={{ color: "var(--muted)", textAlign: "center", marginTop: 6, fontSize: 14 }}>
        {activeCount} vehicle{activeCount !== 1 ? "s" : ""} currently parked
      </p>

      <div style={{ display: "grid", gap: 14, marginTop: 28 }}>
        <button
          onClick={onCheckIn}
          className="card"
          style={{ padding: "22px 22px", textAlign: "left", display: "flex", alignItems: "center", gap: 16, boxShadow: "var(--shadow-sm)", cursor: "pointer" }}
        >
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 9,
              background: "var(--accent-soft)",
              color: "var(--accent)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </div>
          <div>
            <div className="display" style={{ fontSize: 16, fontWeight: 600 }}>
              Check-In
            </div>
            <div style={{ color: "var(--muted)", fontSize: 13, marginTop: 2 }}>Vehicle entering the lot</div>
          </div>
        </button>

        <button
          onClick={onCheckOut}
          className="card"
          style={{ padding: "22px 22px", textAlign: "left", display: "flex", alignItems: "center", gap: 16, boxShadow: "var(--shadow-sm)", cursor: "pointer" }}
        >
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 9,
              background: "var(--surface-muted)",
              color: "var(--ink)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14M13 5l7 7-7 7" />
            </svg>
          </div>
          <div>
            <div className="display" style={{ fontSize: 16, fontWeight: 600 }}>
              Check-Out
            </div>
            <div style={{ color: "var(--muted)", fontSize: 13, marginTop: 2 }}>Vehicle leaving — calculate fee</div>
          </div>
        </button>
      </div>
    </div>
  );
}
