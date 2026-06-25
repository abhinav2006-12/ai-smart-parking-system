import { useState } from "react";

const ADMIN_PIN = "1234"; // demo credential — replace with real auth before production use

export default function AdminLogin({ onSuccess, onBack }) {
  const [pin, setPin] = useState("");
  const [err, setErr] = useState("");

  const submit = (e) => {
    e.preventDefault();
    if (pin === ADMIN_PIN) {
      onSuccess();
    } else {
      setErr("Incorrect PIN. Try 1234 for this demo.");
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <form onSubmit={submit} className="card fade-up" style={{ width: 360, padding: "32px 28px", boxShadow: "var(--shadow-md)" }}>
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 7,
            background: "var(--accent)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 700,
            color: "#fff",
            fontSize: 13,
            marginBottom: 18,
          }}
        >
          P
        </div>
        <h2 className="display" style={{ fontSize: 19, fontWeight: 600 }}>
          Admin Login
        </h2>
        <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 6 }}>Enter your PIN to access the dashboard.</p>

        <div style={{ marginTop: 20 }}>
          <label>PIN</label>
          <input
            type="text"
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
          ← Back
        </button>
      </form>
    </div>
  );
}
