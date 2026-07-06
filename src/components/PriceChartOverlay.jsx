import { useEffect, useState } from "react";

const DEFAULT_RATES = {
  standard: { hourly: 20, minHours: 1 },
  ev:       { hourly: 30, minHours: 1 },
  taxi:     { hourly: 10, minHours: 1 },
};

const VEHICLE_CONFIG = [
  {
    key: "standard",
    label: "Standard",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="3" width="15" height="13" rx="2" />
        <path d="M16 8h4l3 3v5h-7V8z" />
        <circle cx="5.5" cy="18.5" r="2.5" />
        <circle cx="18.5" cy="18.5" r="2.5" />
      </svg>
    ),
    colorLight: "#1D4ED8",
    colorDark:  "#4FA8FF",
    bgLight:    "rgba(29,78,216,0.07)",
    bgDark:     "rgba(79,168,255,0.1)",
  },
  {
    key: "ev",
    label: "EV",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
      </svg>
    ),
    colorLight: "#059669",
    colorDark:  "#10B981",
    bgLight:    "rgba(5,150,105,0.07)",
    bgDark:     "rgba(16,185,129,0.1)",
  },
  {
    key: "taxi",
    label: "Taxi",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l4 4v8a2 2 0 0 1-2 2h-2" />
        <circle cx="9" cy="17" r="2" />
        <circle cx="19" cy="17" r="2" />
        <path d="M3 9h18" />
        <path d="M8 3v6" />
      </svg>
    ),
    colorLight: "#D97706",
    colorDark:  "#F59E0B",
    bgLight:    "rgba(217,119,6,0.07)",
    bgDark:     "rgba(245,158,11,0.1)",
  },
];

export default function PriceChartOverlay({ isOpen, onClose, rates }) {
  const [isDarkOverlay, setIsDarkOverlay] = useState(false);

  useEffect(() => {
    const check = () =>
      setIsDarkOverlay(document.documentElement.getAttribute("data-theme") === "dark");
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        background: isDarkOverlay ? "rgba(10,12,16,0.45)" : "rgba(240,240,240,0.4)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        animation: "fadeUp 0.25s ease-out",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <PriceChartCard rates={rates} onClose={onClose} />
    </div>
  );
}

export function PriceChartCard({ rates, onClose, inline = false }) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const check = () =>
      setIsDark(document.documentElement.getAttribute("data-theme") === "dark");
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);

  const r = {
    standard: { ...DEFAULT_RATES.standard, ...(rates?.standard || {}) },
    ev:       { ...DEFAULT_RATES.ev,       ...(rates?.ev       || {}) },
    taxi:     { ...DEFAULT_RATES.taxi,     ...(rates?.taxi     || {}) },
  };

  const accentBlue = isDark ? "#4FA8FF" : "#1D4ED8";

  return (
    <div
      className="fade-up"
      style={{
        position: "relative",
        width: "100%",
        maxWidth: "480px",
        background: isDark ? "rgba(23,27,33,0.82)" : "rgba(255,255,255,0.85)",
        border: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.07)",
        boxShadow: isDark
          ? "0 12px 40px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.05)"
          : "0 12px 40px rgba(16,24,32,0.12), inset 0 1px 0 rgba(255,255,255,0.6)",
        borderRadius: "16px",
        padding: "24px 20px 20px",
        color: "var(--ink)",
        display: "flex",
        flexDirection: "column",
        gap: "14px",
        backdropFilter: "blur(12px)",
        alignSelf: inline ? "flex-start" : undefined,
        marginTop: inline ? "10px" : undefined,
      }}
    >
      {/* Close Button */}
      {onClose && (
        <button
          onClick={onClose}
          className="btn-ghost"
          aria-label="Close pricing overlay"
          style={{
            position: "absolute",
            top: "14px",
            right: "14px",
            background: "transparent",
            border: "none",
            color: "var(--muted)",
            cursor: "pointer",
            padding: "6px",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      )}

      {/* Header */}
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span
            style={{
              display: "inline-block",
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: accentBlue,
              boxShadow: `0 0 10px ${accentBlue}`,
            }}
          />
          <h3 className="display" style={{ fontSize: "17px", fontWeight: "700", color: "var(--ink)" }}>
            Parking Rates
          </h3>
        </div>
        <p style={{ color: "var(--muted)", fontSize: "12.5px", marginTop: "4px" }}>
          Admin-configured fares by vehicle type.
        </p>
      </div>

      {/* Per-vehicle rate cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {VEHICLE_CONFIG.map((vc) => {
          const typeRate = r[vc.key];
          const color    = isDark ? vc.colorDark : vc.colorLight;
          const bg       = isDark ? vc.bgDark    : vc.bgLight;

          return (
            <div
              key={vc.key}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "14px",
                padding: "14px 16px",
                borderRadius: "12px",
                background: bg,
                border: `1px solid ${color}22`,
              }}
            >
              {/* Vehicle icon */}
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "10px",
                  background: `${color}18`,
                  border: `1px solid ${color}30`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color,
                  flexShrink: 0,
                }}
              >
                {vc.icon}
              </div>

              {/* Label + min hours */}
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: "700", fontSize: "14px", color: "var(--ink)" }}>
                  {vc.label}
                </div>
                <div style={{ fontSize: "11.5px", color: "var(--muted)", marginTop: "2px" }}>
                  Min. billable: {typeRate.minHours} hr{typeRate.minHours !== 1 ? "s" : ""}
                </div>
              </div>

              {/* Rate */}
              <div style={{ fontWeight: "800", fontSize: "22px", color, lineHeight: 1, textAlign: "right", whiteSpace: "nowrap" }}>
                {"\u20B9"}{typeRate.hourly}
                <span style={{ fontWeight: "500", fontSize: "13px", color: "var(--muted)", marginLeft: "2px" }}>
                  /hr
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}