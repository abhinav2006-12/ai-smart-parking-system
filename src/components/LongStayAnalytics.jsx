import React from "react";

/**
 * LongStayAnalytics renders the 4 key smart analytics metric cards:
 * - Total Long Stay Vehicles
 * - Longest Stay (Days)
 * - Average Stay (Days)
 * - Occupied by Long Stay (%)
 */
export default function LongStayAnalytics({ analytics }) {
  const { totalLongStay, longestStayDays, averageStayDays, occupiedPct } = analytics;

  const cards = [
    {
      label: "Long Stay Vehicles",
      value: totalLongStay,
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3C13 6.8 11.5 6 10 6H4c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h3" />
          <circle cx="7.5" cy="17.5" r="2.5" />
          <circle cx="16.5" cy="17.5" r="2.5" />
        </svg>
      ),
      color: totalLongStay > 0 ? "var(--danger)" : "var(--success)"
    },
    {
      label: "Longest Stay",
      value: totalLongStay > 0 ? `${longestStayDays} Days` : "—",
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      ),
      color: "var(--ink)"
    },
    {
      label: "Average Stay",
      value: totalLongStay > 0 ? `${averageStayDays} Days` : "—",
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="20" x2="18" y2="10" />
          <line x1="12" y1="20" x2="12" y2="4" />
          <line x1="6" y1="20" x2="6" y2="14" />
        </svg>
      ),
      color: "var(--ink)"
    },
    {
      label: "Occupied by Long Stay",
      value: `${occupiedPct}%`,
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
          <path d="M22 12A10 10 0 0 0 12 2v10z" fill="currentColor" fillOpacity="0.08" />
        </svg>
      ),
      color: occupiedPct > 15 ? "var(--warning)" : "var(--ink)"
    }
  ];

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        gap: "14px",
        marginBottom: "20px"
      }}
    >
      {cards.map((c, i) => (
        <div
          key={i}
          className="card"
          style={{
            padding: "16px 18px",
            boxShadow: "var(--shadow-sm)",
            display: "flex",
            flexDirection: "column",
            position: "relative",
            overflow: "hidden"
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}
          >
            <span
              style={{
                fontSize: "11px",
                fontWeight: 700,
                color: "var(--muted)",
                textTransform: "uppercase",
                letterSpacing: ".04em"
              }}
            >
              {c.label}
            </span>
            <div style={{ color: "var(--muted)", display: "flex", alignItems: "center" }}>{c.icon}</div>
          </div>
          <div
            className="display"
            style={{
              fontSize: "24px",
              fontWeight: 700,
              marginTop: "8px",
              color: c.color
            }}
          >
            {c.value}
          </div>
        </div>
      ))}
    </div>
  );
}
