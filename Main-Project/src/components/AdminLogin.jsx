import { useState } from "react";
import ThemeToggle from "./ThemeToggle";
import { useTheme } from "../hooks/useTheme";

const ADMIN_PIN = "1234"; // demo credential — replace with real auth before production use

export default function AdminLogin({ onSuccess, onBack }) {
  const [pin, setPin] = useState("");
  const [err, setErr] = useState("");
  const [theme, toggleTheme] = useTheme();

  const submit = (e) => {
    e.preventDefault();
    if (pin === ADMIN_PIN) {
      onSuccess();
    } else {
      setErr("Incorrect PIN.");
      setPin("");
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, position: "relative" }}>
      <div style={{ position: "absolute", top: 20, right: 20 }}>
        <ThemeToggle theme={theme} onToggle={toggleTheme} />
      </div>
      <form onSubmit={submit} className="card fade-up" style={{ width: 360, padding: "32px 28px", boxShadow: "var(--shadow-md)" }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: "var(--accent-soft)",
            color: "var(--accent)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 18,
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="5" y="11" width="14" height="9" rx="2" />
            <path d="M8 11V7a4 4 0 0 1 8 0v4" />
          </svg>
        </div>
        <h2 className="display" style={{ fontSize: 19, fontWeight: 600 }}>
          Admin Access
        </h2>
        <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 6 }}>This area is restricted. Enter your PIN to continue.</p>

        <div style={{ marginTop: 20 }}>
          <label>PIN</label>
          <input
            type="password"
            inputMode="numeric"
            value={pin}
            onChange={(e) => {
              setPin(e.target.value);
              setErr("");
            }}
            placeholder="••••"
            autoFocus
          />
        </div>
        {err && <div style={{ color: "var(--danger)", fontSize: 12.5, marginTop: 8, fontWeight: 500 }}>{err}</div>}

        <button type="submit" className="btn btn-primary" style={{ width: "100%", marginTop: 20 }}>
          Log In
        </button>
        <button type="button" onClick={onBack} className="btn btn-ghost" style={{ width: "100%", marginTop: 8 }}>
          ← Back to site
        </button>
      </form>
    </div>
  );
}
