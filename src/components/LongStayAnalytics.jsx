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
      icon: "🚗",
      color: totalLongStay > 0 ? "var(--danger)" : "var(--success)"
    },
    {
      label: "Longest Stay",
      value: totalLongStay > 0 ? `${longestStayDays} Days` : "—",
      icon: "⏳",
      color: "var(--ink)"
    },
    {
      label: "Average Stay",
      value: totalLongStay > 0 ? `${averageStayDays} Days` : "—",
      icon: "📊",
      color: "var(--ink)"
    },
    {
      label: "Occupied by Long Stay",
      value: `${occupiedPct}%`,
      icon: "📉",
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
            <span style={{ fontSize: "16px" }}>{c.icon}</span>
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
