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
            <span>🚗</span> Vehicle Insight
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
            <span>🤖</span> AI Analysis Insight
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
            <span>💡</span> Recommended Actions
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
