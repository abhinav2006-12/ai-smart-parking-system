import { useState, useEffect } from "react";

export default function OfflinePage({ onRetry }) {
  const [retrying, setRetrying] = useState(false);
  const [dots, setDots] = useState(0);

  // Animated dots for "Checking connection…"
  useEffect(() => {
    if (!retrying) return;
    const id = setInterval(() => setDots((d) => (d + 1) % 4), 400);
    return () => clearInterval(id);
  }, [retrying]);

  const handleRetry = async () => {
    setRetrying(true);
    setDots(0);
    // Give the browser a moment to detect reconnection
    await new Promise((r) => setTimeout(r, 1800));
    setRetrying(false);
    if (navigator.onLine && onRetry) onRetry();
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 20px",
        background: "var(--bg)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Ambient blobs */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          zIndex: 0,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: "-15%",
            left: "-10%",
            width: 480,
            height: 480,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(239,68,68,0.12) 0%, transparent 70%)",
            filter: "blur(40px)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "-10%",
            right: "-10%",
            width: 420,
            height: 420,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(251,146,60,0.10) 0%, transparent 70%)",
            filter: "blur(40px)",
          }}
        />
      </div>

      {/* Card */}
      <div
        className="card fade-up"
        style={{
          position: "relative",
          zIndex: 1,
          maxWidth: 440,
          width: "100%",
          padding: "44px 36px 40px",
          textAlign: "center",
          boxShadow: "0 24px 64px rgba(0,0,0,0.12)",
          borderTop: "3px solid var(--danger, #ef4444)",
        }}
      >
        {/* Animated wifi-off icon */}
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: "50%",
            background: "var(--danger-soft, #fef2f2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 24px",
            position: "relative",
          }}
        >
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--danger, #ef4444)"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {/* Wifi arcs with slash */}
            <line x1="1" y1="1" x2="23" y2="23" />
            <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
            <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
            <path d="M10.71 5.05A16 16 0 0 1 22.56 9" />
            <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
            <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
            <circle cx="12" cy="20" r="1" fill="var(--danger, #ef4444)" />
          </svg>
        </div>

        {/* Title */}
        <h1
          className="display"
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: "var(--ink)",
            margin: "0 0 10px",
          }}
        >
          No Internet Connection
        </h1>

        {/* Subtitle */}
        <p
          style={{
            fontSize: 14,
            color: "var(--muted)",
            margin: "0 0 28px",
            lineHeight: 1.65,
          }}
        >
          ParkPilot needs an internet connection to sync vehicle data and process check-ins.
          Please check your network and try again.
        </p>

        {/* Checklist */}
        <div
          style={{
            background: "var(--surface-muted)",
            borderRadius: "var(--radius-sm, 10px)",
            padding: "16px 18px",
            marginBottom: 28,
            textAlign: "left",
          }}
        >
          {[
            "Check your Wi-Fi or mobile data",
            "Disable VPN or proxy if enabled",
            "Restart your router or hotspot",
          ].map((tip) => (
            <div
              key={tip}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
                fontSize: 13,
                color: "var(--muted)",
                marginBottom: 8,
              }}
            >
              <span
                style={{
                  marginTop: 1,
                  flexShrink: 0,
                  color: "var(--warning, #f59e0b)",
                  fontWeight: 700,
                }}
              >
                •
              </span>
              {tip}
            </div>
          ))}
        </div>

        {/* Retry button */}
        <button
          id="offline-retry-btn"
          onClick={handleRetry}
          disabled={retrying}
          className="btn btn-primary"
          style={{
            width: "100%",
            padding: "13px",
            fontSize: 15,
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 9,
            opacity: retrying ? 0.8 : 1,
            transition: "opacity 0.2s",
          }}
        >
          {retrying ? (
            <>
              <span
                className="spin"
                style={{
                  width: 15,
                  height: 15,
                  border: "2.5px solid rgba(255,255,255,0.35)",
                  borderTopColor: "#fff",
                  borderRadius: "50%",
                  display: "inline-block",
                }}
              />
              {"Checking" + ".".repeat(dots)}
            </>
          ) : (
            <>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.3"
              >
                <path d="M23 4v6h-6" />
                <path d="M1 20v-6h6" />
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
              </svg>
              Try Again
            </>
          )}
        </button>

        {/* Footer hint */}
        <p
          style={{
            fontSize: 11.5,
            color: "var(--muted)",
            marginTop: 18,
            opacity: 0.7,
          }}
        >
          The app will reconnect automatically once your network is restored.
        </p>
      </div>
    </div>
  );
}
