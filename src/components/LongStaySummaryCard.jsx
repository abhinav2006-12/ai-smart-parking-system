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
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="4" y="4" width="16" height="16" rx="2" />
          <rect x="9" y="9" width="6" height="6" rx="1" fill="currentColor" fillOpacity="0.1" />
          <path d="M9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 15h3M1 9h3M1 15h3" />
        </svg>
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
