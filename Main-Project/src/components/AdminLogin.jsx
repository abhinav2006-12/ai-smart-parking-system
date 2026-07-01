import { useState, useEffect } from "react";
import ThemeToggle from "./ThemeToggle";

export default function AdminLogin({
  theme,
  onToggleTheme: toggleTheme,
  onSuccess,
  onBack,
  sessionKicked,
  sessionBlocked,
  onSessionBlockedCheck,
  onSessionReset,
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const [emailFocused, setEmailFocused] = useState(false);
  const [passFocused, setPassFocused] = useState(false);

  // Security features: Lockout after 5 failed attempts
  const [attempts, setAttempts] = useState(0);
  const [lockoutSecs, setLockoutSecs] = useState(0);

  useEffect(() => {
    if (lockoutSecs <= 0) return;
    const timer = setInterval(() => {
      setLockoutSecs((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [lockoutSecs]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (lockoutSecs > 0) {
      setErr(`Too many failed attempts. Locked out for ${lockoutSecs} seconds.`);
      return;
    }

    if (!email.trim() || !password.trim()) {
      setErr("Please enter both your email and password.");
      return;
    }

    setLoading(true);
    setErr("");

    // Simulate authenticating for a high-end feel
    setTimeout(async () => {
      if (email.toLowerCase().trim() === "parkpilot@gmail.com" && password === "parkpilot2025") {
        // Check/claim cross-device session before granting access
        if (onSessionBlockedCheck) {
          const result = await onSessionBlockedCheck();
          if (!result) {
            setLoading(false);
            return; // sessionBlocked state already set in App.jsx
          }
          setSuccess(true);
          setTimeout(() => onSuccess(result.token), 800);
        } else {
          setSuccess(true);
          setTimeout(() => onSuccess(null), 800);
        }
        setAttempts(0);
      } else {
        const nextAttempts = attempts + 1;
        if (nextAttempts >= 5) {
          setLockoutSecs(30);
          setAttempts(0);
          setErr("Too many failed login attempts. Locked out for 30 seconds.");
        } else {
          setAttempts(nextAttempts);
          setErr(`Invalid administrator credentials. Attempt ${nextAttempts} of 5.`);
        }
        setLoading(false);
      }
    }, 1200);
  };

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
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <img src={theme === "dark" ? "/parkpilot_darktheme.png" : "/parkpilot_lighttheme.png"} alt="ParkPilot Logo" style={{ height: 28, objectFit: "contain" }} />
          </div>

          <div style={{ width: 1, height: 16, background: "var(--border)" }} />

          <button onClick={onBack} disabled={loading} className="btn btn-ghost" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14, padding: "6px 10px" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 18l-6-6 6-6" />
            </svg>
            Back
          </button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ color: "var(--muted)", fontSize: 12.5 }}>Admin Console</span>
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
        </div>
      </div>

      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          position: "relative",
        }}
      >

      {/* Full-screen Glassmorphic Session Kicked Overlay */}
      {sessionKicked && (
        <div
          className="fade-up"
          style={{
            position: "fixed",
            inset: 0,
            background: theme === "dark" ? "rgba(10, 12, 16, 0.65)" : "rgba(255, 255, 255, 0.45)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10000,
            padding: 24,
          }}
        >
          <div
            className="card animate-scale-up"
            style={{
              width: "100%",
              maxWidth: 400,
              padding: "36px 30px",
              textAlign: "center",
              background: theme === "dark" ? "rgba(23, 27, 33, 0.85)" : "rgba(255, 255, 255, 0.85)",
              border: theme === "dark" ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid rgba(0, 0, 0, 0.08)",
              boxShadow: "0 20px 50px rgba(0, 0, 0, 0.15)",
              borderRadius: 20,
            }}
          >
            {/* Visual Indicator (Exclamation Badge) */}
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                background: "rgba(124, 58, 237, 0.15)",
                color: "#7C3AED",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 20px",
                border: "1px solid rgba(124, 58, 237, 0.3)",
              }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>

            <h3 className="display" style={{ fontSize: 20, fontWeight: 700, color: "var(--ink)" }}>
              Another User Logged In
            </h3>
            <p style={{ color: "var(--muted)", fontSize: 13.5, marginTop: 8, marginBottom: 24, lineHeight: "1.5" }}>
              Your administrator session was disconnected because another device has claimed the login.
            </p>

            <button
              type="button"
              onClick={onBack}
              className="btn btn-primary"
              style={{
                width: "100%",
                height: 44,
                borderRadius: 10,
                background: "var(--accent)",
                color: "#fff",
                fontWeight: 600,
                fontSize: 14,
                transition: "all 0.2s ease",
              }}
            >
              Return to Home
            </button>
          </div>
        </div>
      )}

      {/* Session Blocked Banner (cross-device) */}
      {sessionBlocked && (
        <div
          className="fade-up"
          style={{
            position: "absolute",
            top: 18,
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(220, 38, 38, 0.12)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            border: "1px solid rgba(220, 38, 38, 0.3)",
            color: "#DC2626",
            fontSize: 12.5,
            fontWeight: 600,
            padding: "9px 18px",
            borderRadius: 12,
            display: "flex",
            alignItems: "center",
            gap: 8,
            boxShadow: "0 8px 32px rgba(220, 38, 38, 0.12)",
            whiteSpace: "nowrap",
            zIndex: 99,
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
          </svg>
          <span>Admin session active on another device. Ask them to log out first.</span>
          {onSessionReset && (
            <button
              type="button"
              onClick={onSessionReset}
              style={{
                background: "rgba(220, 38, 38, 0.15)",
                border: "1px solid rgba(220, 38, 38, 0.3)",
                borderRadius: "6px",
                color: "#DC2626",
                cursor: "pointer",
                fontSize: "11px",
                fontWeight: 700,
                padding: "4px 10px",
                marginLeft: "8px",
                textTransform: "uppercase",
                transition: "all 0.15s ease",
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = "#DC2626";
                e.currentTarget.style.color = "#fff";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = "rgba(220, 38, 38, 0.15)";
                e.currentTarget.style.color = "#DC2626";
              }}
            >
              Reset
            </button>
          )}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="card fade-up"
        style={{
          width: 390,
          padding: "36px 32px",
          boxShadow: theme === "dark" 
            ? "0 12px 40px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.05)" 
            : "0 12px 40px rgba(16, 24, 32, 0.08), 0 0 0 1px rgba(0, 0, 0, 0.01)",
          background: theme === "dark" 
            ? "rgba(23, 27, 33, 0.85)" 
            : "rgba(255, 255, 255, 0.85)",
          backdropFilter: "blur(18px)",
          borderRadius: 16,
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Sleek top crawling loading progress line */}
        {loading && (
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              height: 3,
              width: "100%",
              background: success ? "var(--success)" : "var(--accent)",
              animation: !success ? "vLoaderProgress 1.2s linear infinite" : "none",
              transition: "background-color 0.2s ease",
            }}
          />
        )}

        {/* Security Badge */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "4px 8px",
            borderRadius: 6,
            background: "var(--accent-soft)",
            color: "var(--accent)",
            fontSize: 10.5,
            fontWeight: 700,
            letterSpacing: "0.06em",
            marginBottom: 16,
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: success ? "var(--success)" : "var(--accent)",
              boxShadow: success ? "0 0 8px var(--success)" : "0 0 8px var(--accent)",
              display: "inline-block",
            }}
          />
          ADMIN GATEWAY
        </div>

        {/* Header Titles */}
        <h2 className="display" style={{ fontSize: 23, fontWeight: 700, letterSpacing: "-0.02em" }}>
          ParkPilot Control
        </h2>
        <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 5, marginBottom: 24, lineHeight: "1.4" }}>
          Enter administrator keys below to authenticate secure console link.
        </p>

        {/* Fields */}
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {/* Email field */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.04em", color: "var(--muted)" }}>
              EMAIL ID
            </label>
            <div style={{ position: "relative" }}>
              <span
                style={{
                  position: "absolute",
                  left: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: emailFocused ? "var(--accent)" : "var(--muted)",
                  transition: "color 0.15s ease",
                  display: "flex",
                  alignItems: "center",
                  pointerEvents: "none",
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
              </span>
              <input
                type="email"
                name="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setErr("");
                }}
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
                placeholder="example@gmail.com"
                disabled={loading || lockoutSecs > 0}
                autoFocus
                autoComplete="username"
                spellCheck="false"
                autoCapitalize="none"
                autoCorrect="off"
                style={{
                  height: 44,
                  paddingLeft: 38,
                  paddingRight: 12,
                  borderRadius: 10,
                  fontSize: 14,
                  borderColor: emailFocused ? "var(--accent)" : "var(--border)",
                  boxShadow: emailFocused ? "0 0 0 3px var(--accent-soft)" : "none",
                }}
              />
            </div>
          </div>

          {/* Password field */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.04em", color: "var(--muted)" }}>
              PASSWORD
            </label>
            <div style={{ position: "relative" }}>
              <span
                style={{
                  position: "absolute",
                  left: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: passFocused ? "var(--accent)" : "var(--muted)",
                  transition: "color 0.15s ease",
                  display: "flex",
                  alignItems: "center",
                  pointerEvents: "none",
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </span>
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setErr("");
                }}
                onFocus={() => setPassFocused(true)}
                onBlur={() => setPassFocused(false)}
                placeholder="••••••••"
                disabled={loading || lockoutSecs > 0}
                autoComplete="current-password"
                spellCheck="false"
                autoCapitalize="none"
                autoCorrect="off"
                style={{
                  height: 44,
                  paddingLeft: 38,
                  paddingRight: 40,
                  borderRadius: 10,
                  fontSize: 14,
                  borderColor: passFocused ? "var(--accent)" : "var(--border)",
                  boxShadow: passFocused ? "0 0 0 3px var(--accent-soft)" : "none",
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex="-1"
                style={{
                  position: "absolute",
                  right: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  padding: 0,
                  cursor: "pointer",
                  color: "var(--muted)",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                {showPassword ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {err && (
          <div
            className="fade-up"
            style={{
              color: "var(--danger)",
              fontSize: 12.5,
              marginTop: 12,
              fontWeight: 500,
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: "rgba(220, 38, 38, 0.08)",
              backdropFilter: "blur(4px)",
              WebkitBackdropFilter: "blur(4px)",
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid rgba(220, 38, 38, 0.2)",
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            {err}
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 8 }}>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{
              width: "100%",
              height: 44,
              borderRadius: 10,
              background: success ? "var(--success)" : "var(--accent)",
              borderColor: success ? "var(--success)" : "transparent",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              transition: "all 0.25s ease",
            }}
          >
            {loading ? (
              <>
                {success ? (
                  <>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="animate-scale-up">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    Credentials Verified
                  </>
                ) : (
                  <>
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      className="spin"
                    >
                      <circle cx="12" cy="12" r="10" stroke="rgba(255, 255, 255, 0.25)" />
                      <path d="M12 2a10 10 0 0 1 10 10" />
                    </svg>
                    Authenticating...
                  </>
                )}
              </>
            ) : (
              "Log In"
            )}
          </button>
          
          <button
            type="button"
            onClick={onBack}
            disabled={loading}
            className="btn btn-ghost"
            style={{
              width: "100%",
              height: 44,
              borderRadius: 10,
              fontSize: 13.5,
              fontWeight: 600,
              color: "var(--muted)",
              transition: "all 0.15s ease",
            }}
          >
            ← Back to site
          </button>
        </div>
      </form>
      </div>

      {/* Footer */}
      <footer
        style={{
          textAlign: "center",
          padding: "16px",
          color: "var(--muted)",
          fontSize: 12,
          borderTop: "1px solid var(--border)",
          background: "var(--surface)",
          transition: "background-color 0.3s ease, border-top-color 0.3s ease, color 0.3s ease",
        }}
      >
        ParkPilot Control Gateway &copy; {new Date().getFullYear()} &bull; Secure Administrator Access Only
      </footer>
    </div>
  );
}
