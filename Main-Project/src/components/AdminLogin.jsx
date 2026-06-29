import { useState, useEffect } from "react";
import ThemeToggle from "./ThemeToggle";
import { useTheme } from "../hooks/useTheme";

export default function AdminLogin({ onSuccess, onBack, sessionKicked }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [theme, toggleTheme] = useTheme();

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
    setTimeout(() => {
      if (email.toLowerCase().trim() === "parkpilot@gmail.com" && password === "parkpilot2025") {
        setSuccess(true);
        setAttempts(0);
        setTimeout(() => {
          onSuccess();
        }, 800);
      } else {
        const nextAttempts = attempts + 1;
        if (nextAttempts >= 5) {
          setLockoutSecs(30); // 30 second lockout
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
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        position: "relative",
      }}
    >
      {/* Theme toggle position absolute top right */}
      <div style={{ position: "absolute", top: 24, right: 24 }}>
        <ThemeToggle theme={theme} onToggle={toggleTheme} />
      </div>

      {/* Session Kicked Banner */}
      {sessionKicked && (
        <div
          className="fade-up"
          style={{
            position: "absolute",
            top: 18,
            left: "50%",
            transform: "translateX(-50%)",
            background: "#7C3AED",
            color: "#fff",
            fontSize: 12,
            fontWeight: 600,
            padding: "9px 18px",
            borderRadius: 10,
            display: "flex",
            alignItems: "center",
            gap: 8,
            boxShadow: "0 4px 18px rgba(124,58,237,0.35)",
            whiteSpace: "nowrap",
            zIndex: 99,
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          Session active in another window — only 1 admin allowed at a time.
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
              background: "var(--danger-soft)",
              padding: "10px 12px",
              borderRadius: 8,
              border: "1px solid rgba(var(--danger-rgb), 0.15)",
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
  );
}
