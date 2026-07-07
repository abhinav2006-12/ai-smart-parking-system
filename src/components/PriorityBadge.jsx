import React from "react";

/**
 * PriorityBadge component to render vehicle attention priorities.
 * Levels: Normal, Medium, High, Critical
 */
export default function PriorityBadge({ priority }) {
  const getStyles = () => {
    switch (priority) {
      case "Critical":
        return {
          background: "rgba(220, 38, 38, 0.15)",
          color: "#E53E3E",
          border: "1px solid rgba(220, 38, 38, 0.25)"
        };
      case "High":
        return {
          background: "var(--danger-soft)",
          color: "var(--danger)",
          border: "1px solid rgba(192, 57, 43, 0.2)"
        };
      case "Medium":
        return {
          background: "var(--warning-soft)",
          color: "var(--warning)",
          border: "1px solid rgba(161, 98, 7, 0.2)"
        };
      case "Normal":
      default:
        return {
          background: "var(--success-soft)",
          color: "var(--success)",
          border: "1px solid rgba(31, 122, 77, 0.15)"
        };
    }
  };

  return (
    <span
      className="badge"
      style={{
        ...getStyles(),
        padding: "4px 10px",
        borderRadius: "12px",
        fontSize: "11px",
        fontWeight: "700",
        letterSpacing: "0.02em",
        display: "inline-flex",
        alignItems: "center",
        gap: "4px"
      }}
    >
      {priority === "Critical" && <span style={{ fontSize: "10px" }}>⚠️</span>}
      {priority}
    </span>
  );
}
