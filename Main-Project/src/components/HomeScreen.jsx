import { useState, useEffect } from "react";
import ThemeToggle from "./ThemeToggle";

export default function HomeScreen({ onGuest, theme, onToggleTheme }) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const hour = time.getHours();
  let greeting = "Good morning";
  let greetingIcon = "☀️";
  let weatherTemp = "26°C";
  let weatherCond = "Partly Cloudy";
  let weatherIcon = (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "#FFB300" }}>
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
      <circle cx="12" cy="12" r="4" fill="#FFD54F" />
    </svg>
  );

  if (hour >= 5 && hour < 12) {
    greeting = "Good morning";
    greetingIcon = "☀️";
    weatherTemp = "27°C";
    weatherCond = "Sunny";
  } else if (hour >= 12 && hour < 17) {
    greeting = "Good afternoon";
    greetingIcon = "🌤️";
    weatherTemp = "31°C";
    weatherCond = "Partly Cloudy";
    weatherIcon = (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "#64B5F6" }}>
        <path d="M12 2v2M4.93 4.93l1.41 1.41M2 12h2M19.07 4.93l-1.41 1.41" />
        <path d="M20 17.58A5 5 0 0 0 18 8h-1.26A8 8 0 1 0 4 16.25" />
      </svg>
    );
  } else if (hour >= 17 && hour < 21) {
    greeting = "Good evening";
    greetingIcon = "🌆";
    weatherTemp = "25°C";
    weatherCond = "Clear Sky";
    weatherIcon = (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "#9575CD" }}>
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
      </svg>
    );
  } else {
    greeting = "Good night";
    greetingIcon = "🌙";
    weatherTemp = "22°C";
    weatherCond = "Clear Sky";
    weatherIcon = (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "#7986CB" }}>
        <circle cx="12" cy="12" r="10" />
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" opacity="0.3" />
        <path d="M12 2v20M2 12h20" opacity="0.3" />
      </svg>
    );
  }

  // Format Time and Date
  const formattedTime = time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const formattedDate = time.toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" });

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Header bar */}
      <div
        style={{
          padding: "20px 32px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid var(--border)",
          background: "var(--surface)",
          transition: "background-color 0.3s ease, border-bottom-color 0.3s ease, color 0.3s ease",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 7,
              background: "linear-gradient(135deg, var(--accent), var(--accent-hover))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 700,
              color: "#fff",
              fontSize: 13,
            }}
          >
            P
          </div>
          <span className="display" style={{ fontSize: 16, fontWeight: 600 }}>
            ParkPilot
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ color: "var(--muted)", fontSize: 12.5 }}>AI Smart Parking System</span>
          <ThemeToggle theme={theme} onToggle={onToggleTheme} />
        </div>
      </div>

      {/* Main welcome area */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 24px" }}>
        <div 
          style={{ 
            maxWidth: 1040, 
            width: "100%", 
            display: "flex", 
            flexDirection: "row", 
            flexWrap: "wrap",
            gap: 40,
            alignItems: "stretch"
          }}
        >
          {/* LEFT SIDE COLUMN: Welcome details, weather, clock, tips */}
          <div 
            className="fade-up"
            style={{ 
              flex: "1 1 450px", 
              display: "flex", 
              flexDirection: "column", 
              gap: 20 
            }}
          >
            {/* Greeting & Time Card */}
            <div 
              className="card"
              style={{ 
                padding: "24px 28px", 
                background: "linear-gradient(135deg, var(--accent-soft), var(--surface))",
                border: "1px solid var(--border)",
                borderRadius: 14,
                display: "flex",
                flexDirection: "column",
                gap: 12,
                boxShadow: "var(--shadow-sm)"
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.05em", color: "var(--muted)", textTransform: "uppercase" }}>
                    WELCOME GUEST
                  </span>
                  <h2 className="display" style={{ fontSize: 24, fontWeight: 700, marginTop: 4, display: "flex", alignItems: "center", gap: 8 }}>
                    {greeting}, {greetingIcon}
                  </h2>
                </div>
                
                {/* Weather widget */}
                <div style={{ 
                  display: "flex", 
                  alignItems: "center", 
                  gap: 8, 
                  background: "var(--surface)", 
                  padding: "6px 12px", 
                  borderRadius: 10,
                  border: "1px solid var(--border)"
                }}>
                  {weatherIcon}
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)", lineHeight: 1.1 }}>{weatherTemp}</span>
                    <span style={{ fontSize: 10, color: "var(--muted)" }}>{weatherCond}</span>
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginTop: 8 }}>
                <span className="mono" style={{ fontSize: 32, fontWeight: 700, color: "var(--accent)" }}>
                  {formattedTime}
                </span>
                <span style={{ fontSize: 14, color: "var(--muted)", fontWeight: 500 }}>
                  on {formattedDate}
                </span>
              </div>
            </div>

            {/* Quick Tips & Guide Card */}
            <div 
              className="card"
              style={{ 
                padding: "24px 28px",
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 14,
                boxShadow: "var(--shadow-sm)",
                display: "flex",
                flexDirection: "column",
                gap: 16
              }}
            >
              <h3 className="display" style={{ fontSize: 15, fontWeight: 700, letterSpacing: "0.01em", color: "var(--ink)" }}>
                💡 System Operational Tips
              </h3>
              
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <div style={{ 
                    width: 24, 
                    height: 24, 
                    borderRadius: "50%", 
                    background: "var(--accent-soft)", 
                    color: "var(--accent)",
                    display: "flex", 
                    alignItems: "center", 
                    justifyContent: "center",
                    fontWeight: 700,
                    fontSize: 11,
                    flexShrink: 0
                  }}>1</div>
                  <div>
                    <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink)" }}>Automatic Plate Scanning</span>
                    <p style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 2, lineHeight: 1.4 }}>
                      Snap or upload a clear vehicle front/rear photo. The neural model automatically populates license plates.
                    </p>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <div style={{ 
                    width: 24, 
                    height: 24, 
                    borderRadius: "50%", 
                    background: "var(--accent-soft)", 
                    color: "var(--accent)",
                    display: "flex", 
                    alignItems: "center", 
                    justifyContent: "center",
                    fontWeight: 700,
                    fontSize: 11,
                    flexShrink: 0
                  }}>2</div>
                  <div>
                    <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink)" }}>Dynamic Checkout & UPI</span>
                    <p style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 2, lineHeight: 1.4 }}>
                      System tracking auto-calculates total hours and rates. It displays a dynamic checkout QR code for fast payment.
                    </p>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <div style={{ 
                    width: 24, 
                    height: 24, 
                    borderRadius: "50%", 
                    background: "var(--accent-soft)", 
                    color: "var(--accent)",
                    display: "flex", 
                    alignItems: "center", 
                    justifyContent: "center",
                    fontWeight: 700,
                    fontSize: 11,
                    flexShrink: 0
                  }}>3</div>
                  <div>
                    <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink)" }}>Audit & Revenue Control</span>
                    <p style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 2, lineHeight: 1.4 }}>
                      Admins can access dashboard reports, verify active slots, adjust billing tariffs, and check payment ledgers securely.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT SIDE COLUMN: Gate Counter Action */}
          <div 
            className="fade-up"
            style={{ 
              flex: "1 1 450px", 
              display: "flex", 
              flexDirection: "column", 
              justifyContent: "center",
              alignItems: "center",
              padding: "20px 10px",
              textAlign: "center"
            }}
          >
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "5px 12px",
                borderRadius: 20,
                background: "var(--accent-soft)",
                color: "var(--accent)",
                fontSize: 12,
                fontWeight: 600,
                marginBottom: 20,
              }}
            >
              <span className="pulse" style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent)", display: "inline-block" }} />
              Live gate counter
            </div>

            <h1
              className="display"
              style={{
                fontSize: "clamp(32px, 4vw, 48px)",
                fontWeight: 800,
                lineHeight: 1.15,
                color: "var(--ink)",
                letterSpacing: "-0.03em"
              }}
            >
              Parking, organized.
            </h1>
            
            <p
              style={{
                color: "var(--muted)",
                fontSize: 15.5,
                marginTop: 16,
                marginBottom: 36,
                maxWidth: 440,
                lineHeight: 1.65,
              }}
            >
              Welcome to ParkPilot! Easily check in your vehicle, secure your designated parking slot, and complete hassle-free digital checkouts at our gate counter.
            </p>

            <button
              onClick={onGuest}
              className="card card-hover"
              style={{
                textAlign: "left",
                padding: "24px 32px",
                cursor: "pointer",
                boxShadow: "var(--shadow-md)",
                border: "none",
                borderRadius: 14,
                color: "#fff",
                background: "linear-gradient(135deg, var(--accent), var(--accent-hover))",
                display: "inline-flex",
                alignItems: "center",
                gap: 16,
                maxWidth: 420,
                width: "100%"
              }}
            >
              <div style={{
                background: "rgba(255,255,255,0.15)",
                borderRadius: 10,
                width: 42,
                height: 42,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0
              }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3" />
                </svg>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                <span className="display" style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-0.01em" }}>
                  Open Gate Counter
                </span>
                <span style={{ fontSize: 12.5, opacity: 0.85, fontWeight: 500 }}>
                  Enter check-in/checkout gateway console
                </span>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Footer bar */}
      <footer style={{
        textAlign: "center",
        padding: "16px",
        color: "var(--muted)",
        fontSize: 12,
        borderTop: "1px solid var(--border)",
        background: "var(--surface)",
        transition: "background-color 0.3s ease, border-top-color 0.3s ease, color 0.3s ease",
      }}>
        ParkPilot &copy; {new Date().getFullYear()} &bull; AI Smart Parking Management System &bull; Plate detection is AI-assisted — always confirm before submitting.
      </footer>
    </div>
  );
}
