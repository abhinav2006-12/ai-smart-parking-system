import React, { useEffect, useMemo } from "react";
import PriorityBadge from "./PriorityBadge";
import { fmtDateTime, fmtMoney } from "../lib/format";
import {
  formatDurationShort,
  getPriorityLevel,
  calculateAccruedFee,
  generateAIInsight,
  getRecommendations
} from "../lib/longStayRules";

/**
 * VehicleInsightModal renders a detailed dashboard dialog modal showing details
 * of long-stay vehicles along with dynamic AI analysis and action recommendations.
 */
export default function VehicleInsightModal({ vehicle, settings, onClose }) {
  // Close dialog on Escape press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const now = Date.now();
  const durationMs = vehicle ? now - vehicle.entryTime : 0;
  const durationDays = durationMs / (1000 * 60 * 60 * 24);

  // Compute stay characteristics exactly when inputs change, not on every render
  const {
    formattedDuration,
    accruedFee,
    priority,
    aiInsight,
    recommendations
  } = useMemo(() => {
    if (!vehicle) {
      return {
        formattedDuration: "",
        accruedFee: 0,
        priority: "Normal",
        aiInsight: "",
        recommendations: []
      };
    }
    const fDuration = formatDurationShort(durationMs);
    const fee = calculateAccruedFee(vehicle, settings, now);
    const prio = getPriorityLevel(durationMs);
    const insight = generateAIInsight(vehicle, fDuration, fee, prio);
    const recs = getRecommendations(vehicle, fee, prio, durationDays);

    return {
      formattedDuration: fDuration,
      accruedFee: fee,
      priority: prio,
      aiInsight: insight,
      recommendations: recs
    };
  }, [vehicle, settings, now, durationMs, durationDays]);

  if (!vehicle) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="vehicle-insight-title"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        background: "rgba(0, 0, 0, 0.45)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="card fade-up"
        style={{
          maxWidth: 520,
          width: "100%",
          padding: "26px",
          background: "var(--surface)",
          border: "1px solid var(--border)",
          boxShadow: "var(--shadow-md)",
          borderRadius: "var(--radius)",
          position: "relative"
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <h3 id="vehicle-insight-title" style={{ fontSize: "17px", fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--accent)" }}>
              <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3C13 6.8 11.5 6 10 6H4c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h3" />
              <circle cx="7.5" cy="17.5" r="2.5" />
              <circle cx="16.5" cy="17.5" r="2.5" />
            </svg>
            Vehicle Insight
          </h3>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            style={{
              background: "transparent",
              border: "none",
              fontSize: "20px",
              color: "var(--muted)",
              cursor: "pointer",
              padding: "4px 8px",
              lineHeight: 1,
              borderRadius: "4px",
              transition: "background-color 0.2s"
            }}
          >
            &times;
          </button>
        </div>

        {/* Vehicle Metadata Info Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "12px 16px",
            background: "var(--surface-muted)",
            padding: "16px",
            borderRadius: "var(--radius-sm)",
            marginBottom: 20,
            fontSize: "13px"
          }}
        >
          <div>
            <span style={{ color: "var(--muted)", display: "block", marginBottom: 2, fontSize: "11px", fontWeight: "600", uppercase: "true" }}>Vehicle Number</span>
            <strong className="mono" style={{ fontSize: "14px", color: "var(--ink)", fontWeight: 700 }}>{vehicle.number}</strong>
          </div>
          <div>
            <span style={{ color: "var(--muted)", display: "block", marginBottom: 2, fontSize: "11px", fontWeight: "600", uppercase: "true" }}>Vehicle Type</span>
            <strong style={{ textTransform: "capitalize", color: "var(--ink)", fontWeight: 600 }}>{vehicle.type}</strong>
          </div>
          <div>
            <span style={{ color: "var(--muted)", display: "block", marginBottom: 2, fontSize: "11px", fontWeight: "600", uppercase: "true" }}>Entry Date & Time</span>
            <span style={{ color: "var(--ink)", fontWeight: 500 }}>{fmtDateTime(vehicle.entryTime)}</span>
          </div>
          <div>
            <span style={{ color: "var(--muted)", display: "block", marginBottom: 2, fontSize: "11px", fontWeight: "600", uppercase: "true" }}>Current Parking Duration</span>
            <span style={{ color: "var(--ink)", fontWeight: 500 }}>{formattedDuration}</span>
          </div>
          <div>
            <span style={{ color: "var(--muted)", display: "block", marginBottom: 2, fontSize: "11px", fontWeight: "600", uppercase: "true" }}>Current Parking Fee</span>
            <strong style={{ color: "var(--accent)", fontSize: "14px", fontWeight: 700 }}>{fmtMoney(accruedFee)}</strong>
          </div>
          <div>
            <span style={{ color: "var(--muted)", display: "block", marginBottom: 2, fontSize: "11px", fontWeight: "600", uppercase: "true" }}>Parking Status</span>
            <div>
              <span
                className="badge"
                style={{
                  background: "var(--warning-soft)",
                  color: "var(--warning)",
                  padding: "2px 8px",
                  fontSize: "11px",
                  fontWeight: "600"
                }}
              >
                Parked
              </span>
            </div>
          </div>
          <div style={{ gridColumn: "span 2" }}>
            <span style={{ color: "var(--muted)", display: "block", marginBottom: 4, fontSize: "11px", fontWeight: "600" }}>Priority Level</span>
            <PriorityBadge priority={priority} />
          </div>
        </div>

        {/* AI Insight */}
        <div style={{ marginBottom: 20 }}>
          <h4 style={{ fontSize: "13.5px", fontWeight: 700, margin: "0 0 8px 0", display: "flex", alignItems: "center", gap: "6px" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--accent)" }}>
              <rect x="4" y="4" width="16" height="16" rx="2" />
              <rect x="9" y="9" width="6" height="6" rx="1" fill="currentColor" fillOpacity="0.1" />
              <path d="M9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 15h3M1 9h3M1 15h3" />
            </svg>
            AI Analysis Insight
          </h4>
          <div
            style={{
              background: "var(--accent-soft)",
              color: "var(--ink)",
              padding: "14px",
              borderRadius: "var(--radius-sm)",
              fontSize: "13px",
              lineHeight: "1.5",
              borderLeft: "4px solid var(--accent)"
            }}
          >
            {aiInsight}
          </div>
        </div>

        {/* Recommendations */}
        <div style={{ marginBottom: 24 }}>
          <h4 style={{ fontSize: "13.5px", fontWeight: 700, margin: "0 0 8px 0", display: "flex", alignItems: "center", gap: "6px" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--warning)" }}>
              <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A5 5 0 0 0 8 8c0 1 .3 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" />
              <line x1="9" y1="18" x2="15" y2="18" />
              <line x1="10" y1="22" x2="14" y2="22" />
            </svg>
            Recommended Actions
          </h4>
          <ul style={{ margin: 0, paddingLeft: "18px", fontSize: "13px", color: "var(--ink)", lineHeight: "1.6" }}>
            {recommendations.map((rec, index) => (
              <li key={index} style={{ marginBottom: 4 }}>{rec}</li>
            ))}
          </ul>
        </div>

        {/* Modal Actions */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, borderTop: "1px solid var(--border)", paddingTop: 16 }}>
          <button
            className="btn btn-primary"
            onClick={onClose}
            style={{ padding: "8px 24px", fontSize: "13px", fontWeight: 600 }}
          >
            Close Insight
          </button>
        </div>
      </div>
    </div>
  );
}
