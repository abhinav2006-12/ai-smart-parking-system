import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

// Mock dummy data for dynamic parking rates (price per hour in ₹)
const DEFAULT_PRICING_DATA = [
  { time: "08:00", Standard: 30, EV: 15, Taxi: 10 },
  { time: "10:00", Standard: 60, EV: 30, Taxi: 15 },
  { time: "12:00", Standard: 80, EV: 40, Taxi: 15 },
  { time: "14:00", Standard: 70, EV: 35, Taxi: 10 },
  { time: "16:00", Standard: 50, EV: 25, Taxi: 10 },
  { time: "18:00", Standard: 90, EV: 45, Taxi: 20 },
  { time: "20:00", Standard: 80, EV: 40, Taxi: 15 },
  { time: "22:00", Standard: 40, EV: 20, Taxi: 10 },
];

export default function PriceChartOverlay({ isOpen, onClose, data = DEFAULT_PRICING_DATA }) {
  const [isDarkOverlay, setIsDarkOverlay] = useState(false);

  useEffect(() => {
    const checkTheme = () => {
      const themeAttr = document.documentElement.getAttribute("data-theme");
      setIsDarkOverlay(themeAttr === "dark");
    };

    checkTheme();

    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

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
        background: isDarkOverlay ? "rgba(10, 12, 16, 0.45)" : "rgba(240, 240, 240, 0.4)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        animation: "fadeUp 0.25s ease-out",
      }}
      onClick={handleBackdropClick}
    >
      <PriceChartCard data={data} onClose={onClose} />
    </div>
  );
}

export function PriceChartCard({ data = DEFAULT_PRICING_DATA, onClose, inline = false }) {
  const [isDark, setIsDark] = useState(false);
  const [activeTab, setActiveTab] = useState("all"); // all | standard | ev | taxi

  // Detect theme updates
  useEffect(() => {
    const checkTheme = () => {
      const themeAttr = document.documentElement.getAttribute("data-theme");
      setIsDark(themeAttr === "dark");
    };

    checkTheme();

    // Create a MutationObserver to listen for changes to the data-theme attribute
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    return () => observer.disconnect();
  }, []);

  // Colors for lines and fills
  const colors = {
    Standard: {
      stroke: isDark ? "#4FA8FF" : "#1D4ED8",
      fill: "url(#colorStandard)",
    },
    EV: {
      stroke: isDark ? "#10B981" : "#059669",
      fill: "url(#colorEV)",
    },
    Taxi: {
      stroke: isDark ? "#F59E0B" : "#D97706",
      fill: "url(#colorTaxi)",
    },
  };

  const cardStyle = {
    position: "relative",
    width: "100%",
    maxWidth: "580px",
    background: isDark
      ? "rgba(23, 27, 33, 0.75)"
      : "rgba(255, 255, 255, 0.72)",
    border: isDark
      ? "1px solid rgba(255, 255, 255, 0.08)"
      : "1px solid rgba(0, 0, 0, 0.07)",
    boxShadow: isDark
      ? "0 12px 40px 0 rgba(0, 0, 0, 0.55), inset 0 1px 0 0 rgba(255, 255, 255, 0.05)"
      : "0 12px 40px 0 rgba(16, 24, 32, 0.12), inset 0 1px 0 0 rgba(255, 255, 255, 0.5)",
    borderRadius: "16px",
    padding: "24px 20px 20px 20px",
    color: "var(--ink)",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    backdropFilter: "blur(10px)",
    alignSelf: inline ? "flex-start" : undefined,
    marginTop: inline ? "10px" : undefined,
  };

  const closeButtonStyle = {
    position: "absolute",
    top: "16px",
    right: "16px",
    background: "transparent",
    border: "none",
    color: "var(--muted)",
    cursor: "pointer",
    padding: "6px",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "background-color 0.2s ease, color 0.2s ease",
  };

  // Custom Glassmorphic Tooltip for Recharts
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div
          style={{
            background: isDark ? "rgba(30, 36, 45, 0.85)" : "rgba(255, 255, 255, 0.85)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            border: isDark
              ? "1px solid rgba(255, 255, 255, 0.1)"
              : "1px solid rgba(0, 0, 0, 0.1)",
            padding: "10px 14px",
            borderRadius: "8px",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
          }}
        >
          <p style={{ margin: "0 0 6px 0", fontWeight: "600", fontSize: "12px", color: "var(--muted)" }}>
            Time: {label}
          </p>
          {payload.map((p) => (
            <div key={p.name} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", marginTop: "4px" }}>
              <span
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  backgroundColor: p.stroke,
                  display: "inline-block",
                }}
              />
              <span style={{ fontWeight: "500", color: "var(--ink)" }}>{p.name}:</span>
              <span style={{ fontWeight: "700", color: "var(--ink)", marginLeft: "auto" }}>
                ₹{p.value}/hr
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
      <div style={cardStyle} className="fade-up">
        {/* Close Button */}
        {onClose && (
          <button
            onClick={onClose}
            style={closeButtonStyle}
            className="btn-ghost"
            aria-label="Close pricing overlay"
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
                background: colors.Standard.stroke,
                boxShadow: `0 0 10px ${colors.Standard.stroke}`,
              }}
            />
            <h3 className="display" style={{ fontSize: "18px", fontWeight: "600", color: "var(--ink)" }}>
              Parking Rates
            </h3>
          </div>
          <p style={{ color: "var(--muted)", fontSize: "12.5px", marginTop: "4px" }}>
            Real-time dynamic hourly pricing based on time of day and vehicle demand.
          </p>
        </div>

        {/* Tab Selection */}
        <div
          style={{
            display: "flex",
            background: isDark ? "rgba(255, 255, 255, 0.04)" : "rgba(0, 0, 0, 0.03)",
            padding: "4px",
            borderRadius: "8px",
            gap: "4px",
          }}
        >
          {[
            { key: "all", label: "All Vehicles" },
            { key: "standard", label: "Standard" },
            { key: "ev", label: "EV (Save 50%)" },
            { key: "taxi", label: "Taxi" },
          ].map((tab) => {
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  flex: 1,
                  padding: "8px 6px",
                  fontSize: "12px",
                  fontWeight: "600",
                  borderRadius: "6px",
                  border: "none",
                  backgroundColor: active
                    ? isDark
                      ? "rgba(255, 255, 255, 0.08)"
                      : "#ffffff"
                    : "transparent",
                  color: active ? "var(--ink)" : "var(--muted)",
                  boxShadow: active && !isDark ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Chart Container */}
        <div
          style={{
            height: "220px",
            width: "100%",
            marginTop: "8px",
            position: "relative",
          }}
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 5, left: -25, bottom: 0 }}>
              <defs>
                <linearGradient id="colorStandard" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={colors.Standard.stroke} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={colors.Standard.stroke} stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="colorEV" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={colors.EV.stroke} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={colors.EV.stroke} stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="colorTaxi" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={colors.Taxi.stroke} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={colors.Taxi.stroke} stopOpacity={0.0} />
                </linearGradient>
              </defs>

              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke={isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.05)"}
              />

              <XAxis
                dataKey="time"
                tickLine={false}
                axisLine={false}
                tick={{ fill: "var(--muted)", fontSize: 10 }}
                dy={6}
              />

              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fill: "var(--muted)", fontSize: 10 }}
                tickFormatter={(val) => `₹${val}`}
                dx={-4}
              />

              <Tooltip content={<CustomTooltip />} cursor={{ stroke: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)" }} />

              <Legend
                verticalAlign="top"
                height={36}
                iconType="circle"
                iconSize={8}
                wrapperStyle={{
                  fontSize: "11px",
                  paddingBottom: "10px",
                }}
              />

              {(activeTab === "all" || activeTab === "standard") && (
                <Area
                  type="monotone"
                  dataKey="Standard"
                  name="Standard"
                  stroke={colors.Standard.stroke}
                  strokeWidth={2}
                  fillOpacity={1}
                  fill={colors.Standard.fill}
                  activeDot={{ r: 5 }}
                />
              )}

              {(activeTab === "all" || activeTab === "ev") && (
                <Area
                  type="monotone"
                  dataKey="EV"
                  name="EV"
                  stroke={colors.EV.stroke}
                  strokeWidth={2}
                  fillOpacity={1}
                  fill={colors.EV.fill}
                  activeDot={{ r: 5 }}
                />
              )}

              {(activeTab === "all" || activeTab === "taxi") && (
                <Area
                  type="monotone"
                  dataKey="Taxi"
                  name="Taxi"
                  stroke={colors.Taxi.stroke}
                  strokeWidth={2}
                  fillOpacity={1}
                  fill={colors.Taxi.fill}
                  activeDot={{ r: 5 }}
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Legend / Info Footer */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: "10px",
            marginTop: "4px",
            borderTop: isDark ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(0,0,0,0.05)",
            paddingTop: "12px",
          }}
        >
          <div style={{ textAlign: "center" }}>
            <span style={{ fontSize: "10px", color: "var(--muted)", fontWeight: "600", textTransform: "uppercase" }}>Standard Peak</span>
            <div style={{ fontSize: "14px", fontWeight: "700", color: colors.Standard.stroke, marginTop: "2px" }}>₹80/hr</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <span style={{ fontSize: "10px", color: "var(--muted)", fontWeight: "600", textTransform: "uppercase" }}>EV Incentivized</span>
            <div style={{ fontSize: "14px", fontWeight: "700", color: colors.EV.stroke, marginTop: "2px" }}>₹40/hr</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <span style={{ fontSize: "10px", color: "var(--muted)", fontWeight: "600", textTransform: "uppercase" }}>Disabled/Special</span>
            <div style={{ fontSize: "14px", fontWeight: "700", color: colors.Disabled.stroke, marginTop: "2px" }}>₹20/hr</div>
          </div>
        </div>
    </div>
  );
}
