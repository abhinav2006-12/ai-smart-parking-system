import React from "react";
import { generateAISummary } from "../lib/longStayRules";

/**
 * LongStaySummaryCard displays a glassmorphic overview section
 * containing a dynamically generated AI summary text based on parking analytics.
 */
export default function LongStaySummaryCard({ analytics }) {
  const summaryText = generateAISummary(analytics);

  return (
    <div
      className="card fade-up"
      style={{
        padding: "18px 20px",
        marginBottom: "20px",
        background: "rgba(47, 72, 88, 0.05)",
        backdropFilter: "blur(6px)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        boxShadow: "var(--shadow-sm)",
        display: "flex",
        alignItems: "flex-start",
        gap: "16px",
        transition: "all 0.3s ease",
      }}
    >
      <div
        style={{
          fontSize: "22px",
          background: "var(--accent-soft)",
          padding: "8px",
          borderRadius: "var(--radius-sm)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--accent)",
          width: "40px",
          height: "40px",
          flexShrink: 0
        }}
      >
        🤖
      </div>
      <div style={{ flex: 1 }}>
        <h3
          style={{
            fontSize: "14px",
            fontWeight: 700,
            margin: "0 0 4px 0",
            color: "var(--ink)"
          }}
        >
          Long Stay Overview
        </h3>
        <p
          style={{
            fontSize: "13px",
            margin: 0,
            color: "var(--ink)",
            lineHeight: "1.5",
            fontWeight: 500
          }}
        >
          {summaryText}
        </p>
      </div>
    </div>
  );
}
