import { useState, useEffect } from "react";

const LOADING_MESSAGES = [
  "Connecting to secure database...",
  "Establishing cloud data tunnel...",
  "Syncing real-time parking spaces...",
  "Locating active garage nodes...",
  "Initializing smart camera triggers...",
  "Loading localized parking tariffs...",
  "Securing transaction ledger..."
];

export default function VehicleLoader() {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
    }, 1800);
    return () => clearInterval(timer);
  }, []);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        gap: 16,
        padding: 24,
      }}
    >
      {/* Dynamic Vehicle SVG */}
      <div style={{ position: "relative", width: 160, height: 64 }}>
        <svg
          width="160"
          height="64"
          viewBox="0 0 160 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Smooth body gradient */}
            <linearGradient id="v-loader-body-grad" x1="20" y1="36" x2="122" y2="36" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="var(--accent)" />
              <stop offset="100%" stopColor="var(--accent-hover)" />
            </linearGradient>
            
            {/* Glow projection from headlights */}
            <linearGradient id="v-loader-light-grad" x1="122" y1="41" x2="155" y2="41" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.4" />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Under-car Shadow */}
          <ellipse cx="71" cy="53" rx="42" ry="3" fill="var(--border)" opacity="0.6" />

          {/* Speed Wind Lines (moving behind the car) */}
          <g>
            <line x1="5" y1="18" x2="20" y2="18" stroke="var(--muted)" strokeWidth="1.5" strokeLinecap="round" className="v-loader-speed-line" />
            <line x1="-5" y1="28" x2="15" y2="28" stroke="var(--border)" strokeWidth="1.5" strokeLinecap="round" className="v-loader-speed-line" />
            <line x1="2" y1="38" x2="18" y2="38" stroke="var(--muted)" strokeWidth="1" strokeLinecap="round" className="v-loader-speed-line" />
          </g>

          {/* Headlight beam glow */}
          <polygon points="122,41 155,33 155,47" fill="url(#v-loader-light-grad)" className="v-loader-glow" />

          {/* Main Car Body Group (suspension bounce) */}
          <g className="v-loader-body">
            {/* Chassis outline */}
            <path
              d="M 20 50 C 18 50, 18 44, 20 44 L 24 38 C 30 32, 45 22, 60 22 L 94 22 C 104 22, 114 36, 120 38 L 126 44 C 126 46, 125 50, 122 50 L 116 50 C 116 41, 106 41, 96 41 C 86 41, 86 50, 76 50 L 58 50 C 58 41, 48 41, 38 41 C 28 41, 28 50, 20 50 Z"
              fill="url(#v-loader-body-grad)"
            />

            {/* Rear window */}
            <path
              d="M 40 32 C 46 27, 56 24, 66 24 L 66 32 Z"
              fill="var(--surface)"
              opacity="0.3"
            />

            {/* Front window */}
            <path
              d="M 70 24 L 88 24 C 94 24, 100 30, 103 32 L 70 32 Z"
              fill="var(--surface)"
              opacity="0.3"
            />

            {/* Red Taillight LED */}
            <path d="M 18.5 40 L 18 43 L 20 42 Z" fill="var(--danger)" />

            {/* Cyan/Green Headlight LED */}
            <path d="M 125 40 L 126 42 L 124 41 Z" fill="var(--success)" />
          </g>

          {/* Front Wheel (Spinning) */}
          <g className="v-loader-wheel" transform="translate(96, 50)">
            <circle cx="0" cy="0" r="9.5" fill="var(--ink)" />
            <circle cx="0" cy="0" r="7.5" fill="var(--border)" />
            <circle cx="0" cy="0" r="6" fill="var(--ink)" />
            <line x1="-6" y1="0" x2="6" y2="0" stroke="var(--border)" strokeWidth="1.5" />
            <line x1="0" y1="-6" x2="0" y2="6" stroke="var(--border)" strokeWidth="1.5" />
            <circle cx="0" cy="0" r="2.5" fill="var(--surface)" />
          </g>

          {/* Rear Wheel (Spinning) */}
          <g className="v-loader-wheel" transform="translate(38, 50)">
            <circle cx="0" cy="0" r="9.5" fill="var(--ink)" />
            <circle cx="0" cy="0" r="7.5" fill="var(--border)" />
            <circle cx="0" cy="0" r="6" fill="var(--ink)" />
            <line x1="-6" y1="0" x2="6" y2="0" stroke="var(--border)" strokeWidth="1.5" />
            <line x1="0" y1="-6" x2="0" y2="6" stroke="var(--border)" strokeWidth="1.5" />
            <circle cx="0" cy="0" r="2.5" fill="var(--surface)" />
          </g>

          {/* Road dashes moving under the car */}
          <line
            x1="5"
            y1="61"
            x2="155"
            y2="61"
            stroke="var(--border)"
            strokeWidth="2.5"
            strokeDasharray="10 8"
            className="v-loader-road"
          />
        </svg>
      </div>

      {/* Rotating Database/Sync status message */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, minHeight: 40 }}>
        <div
          key={messageIndex}
          className="fade-up"
          style={{
            fontSize: 13.5,
            fontWeight: 600,
            color: "var(--ink)",
            letterSpacing: "0.01em",
            textAlign: "center",
          }}
        >
          {LOADING_MESSAGES[messageIndex]}
        </div>

        {/* Indeterminate linear progress bar */}
        <div
          style={{
            width: 140,
            height: 3,
            background: "var(--surface-muted)",
            border: "1px solid var(--border)",
            borderRadius: 2,
            overflow: "hidden",
            position: "relative",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              width: "50%",
              background: "var(--accent)",
              borderRadius: 2,
              animation: "vLoaderProgress 1.6s cubic-bezier(0.4, 0, 0.2, 1) infinite",
            }}
          />
        </div>
      </div>
    </div>
  );
}
