import { useState, useEffect, useCallback } from "react";
import {
  listAdminAccounts,
  createAdminAccount,
  setAdminAccountActive,
  deleteAdminAccount,
  resetAdminPassword,
} from "../lib/adminAuth";
import { logActivity } from "../lib/activityLog";

const ROLE_LABELS = {
  head:         { label: "Head Admin",    color: "#6366F1" },
  gate_manager: { label: "Gate Manager",  color: "#0EA5E9" },
  security:     { label: "Security",      color: "#10B981" },
};

function RoleBadge({ role }) {
  const cfg = ROLE_LABELS[role] || { label: role, color: "#94A3B8" };
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, letterSpacing: ".04em",
      padding: "2px 9px", borderRadius: 20,
      background: cfg.color + "18", color: cfg.color,
      border: `1px solid ${cfg.color}30`,
    }}>
      {cfg.label}
    </span>
  );
}

function PasswordStrength({ password }) {
  const score = [/.{8,}/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/]
    .filter((r) => r.test(password)).length;
  const labels = ["", "Weak", "Fair", "Good", "Strong"];
  const colors = ["", "#EF4444", "#F59E0B", "#3B82F6", "#10B981"];
  if (!password) return null;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
      {[1,2,3,4].map((i) => (
        <div key={i} style={{
          flex: 1, height: 3, borderRadius: 2,
          background: i <= score ? colors[score] : "var(--border)",
          transition: "background .2s",
        }} />
      ))}
      <span style={{ fontSize: 11, color: colors[score], fontWeight: 600, minWidth: 42 }}>
        {labels[score]}
      </span>
    </div>
  );
}

export default function AdminAccountsTab({ adminUser }) {
  const [accounts, setAccounts]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");
  const [showForm, setShowForm]   = useState(false);
  const [form, setForm]           = useState({ name:"", email:"", phone:"", role:"gate_manager", password:"", confirm:"" });
  const [formErr, setFormErr]     = useState("");
  const [saving, setSaving]       = useState(false);
  const [saved, setSaved]         = useState(false);
  const [resetTarget, setResetTarget] = useState(null); // { id, name }
  const [newPw, setNewPw]         = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setAccounts(await listAdminAccounts());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setFormErr("");
    if (!form.name || !form.email || !form.password) { setFormErr("Name, email and password are required."); return; }
    if (form.password !== form.confirm) { setFormErr("Passwords do not match."); return; }
    if (form.password.length < 6) { setFormErr("Password must be at least 6 characters."); return; }
    setSaving(true);
    try {
      await createAdminAccount({ ...form, createdBy: adminUser.email });
      await logActivity(adminUser, "Created admin account", { name: form.name, email: form.email, role: form.role });
      setForm({ name:"", email:"", phone:"", role:"gate_manager", password:"", confirm:"" });
      setShowForm(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      await load();
    } catch (e) {
      setFormErr(e.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (acc) => {
    try {
      await setAdminAccountActive(acc.id, !acc.is_active);
      await logActivity(adminUser, acc.is_active ? "Deactivated admin account" : "Activated admin account", { email: acc.email });
      await load();
    } catch(e) { alert(e.message); }
  };

  const handleDelete = async (acc) => {
    if (!window.confirm(`Delete account for ${acc.name} (${acc.email})? This cannot be undone.`)) return;
    try {
      await deleteAdminAccount(acc.id);
      await logActivity(adminUser, "Deleted admin account", { email: acc.email });
      await load();
    } catch(e) { alert(e.message); }
  };

  const handleResetPw = async () => {
    if (!newPw || newPw.length < 6) { alert("Password must be at least 6 characters."); return; }
    try {
      await resetAdminPassword(resetTarget.id, newPw);
      await logActivity(adminUser, "Reset password for account", { email: resetTarget.email });
      setResetTarget(null);
      setNewPw("");
      alert("Password reset successfully.");
    } catch(e) { alert(e.message); }
  };

  return (
    <div className="fade-up" style={{ display:"flex", flexDirection:"column", gap:20 }}>
      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:10 }}>
        <div>
          <h2 className="display" style={{ fontSize:20, fontWeight:700, margin:0 }}>Admin Accounts</h2>
          <p style={{ color:"var(--muted)", fontSize:13, marginTop:4 }}>
            Manage Gate Manager &amp; Security staff accounts.
          </p>
        </div>
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          {saved && <span style={{ color:"var(--success)", fontSize:13, fontWeight:600 }}>✓ Account created</span>}
          <button className="btn btn-primary" onClick={() => { setShowForm(!showForm); setFormErr(""); }}>
            {showForm ? "Cancel" : "+ New Account"}
          </button>
        </div>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="card fade-up" style={{ padding:24, boxShadow:"var(--shadow-sm)" }}>
          <h3 className="display" style={{ fontSize:15, fontWeight:700, marginBottom:16 }}>Create New Account</h3>
          <form onSubmit={handleCreate} style={{ display:"flex", flexDirection:"column", gap:14 }}>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
              <div>
                <label>Full Name</label>
                <input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="John Doe" />
              </div>
              <div>
                <label>Email</label>
                <input type="email" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} placeholder="staff@park.com" />
              </div>
              <div>
                <label>Phone Number</label>
                <input value={form.phone} onChange={e=>setForm(f=>({...f,phone:e.target.value}))} placeholder="+91 9876543210" />
              </div>
              <div>
                <label>Role</label>
                <select value={form.role} onChange={e=>setForm(f=>({...f,role:e.target.value}))}
                  style={{ width:"100%", padding:"9px 12px", borderRadius:"var(--radius-sm)", border:"1px solid var(--border)", background:"var(--surface)", color:"var(--ink)", fontSize:14 }}>
                  <option value="gate_manager">Gate Manager</option>
                  <option value="security">Security</option>
                </select>
              </div>
              <div>
                <label>Password</label>
                <input type="password" value={form.password} onChange={e=>setForm(f=>({...f,password:e.target.value}))} placeholder="Min. 6 characters" />
                <PasswordStrength password={form.password} />
              </div>
              <div>
                <label>Confirm Password</label>
                <input type="password" value={form.confirm} onChange={e=>setForm(f=>({...f,confirm:e.target.value}))} placeholder="Re-enter password" />
              </div>
            </div>
            {formErr && <div style={{ color:"var(--danger)", fontSize:13, fontWeight:500 }}>⚠ {formErr}</div>}
            <button type="submit" disabled={saving} className="btn btn-primary" style={{ alignSelf:"flex-start", minWidth:140 }}>
              {saving ? "Creating…" : "Create Account"}
            </button>
          </form>
        </div>
      )}

      {/* Accounts list */}
      {loading ? (
        <div style={{ color:"var(--muted)", fontSize:13, padding:"20px 0" }}>Loading accounts…</div>
      ) : error ? (
        <div style={{ color:"var(--danger)", fontSize:13 }}>⚠ {error}</div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {accounts.map((acc) => (
            <div key={acc.id} className="card" style={{
              padding:"16px 20px", boxShadow:"var(--shadow-sm)",
              display:"flex", alignItems:"center", gap:14, flexWrap:"wrap",
              opacity: acc.is_active ? 1 : 0.55,
            }}>
              {/* Avatar */}
              <div style={{
                width:40, height:40, borderRadius:"50%", flexShrink:0,
                background: ROLE_LABELS[acc.role]?.color + "18" || "var(--surface-muted)",
                color: ROLE_LABELS[acc.role]?.color || "var(--muted)",
                display:"flex", alignItems:"center", justifyContent:"center",
                fontWeight:700, fontSize:16,
              }}>
                {acc.name?.[0]?.toUpperCase() || "?"}
              </div>
              {/* Info */}
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
                  <span style={{ fontWeight:700, fontSize:14, color:"var(--ink)" }}>{acc.name}</span>
                  <RoleBadge role={acc.role} />
                  {!acc.is_active && <span style={{ fontSize:11, color:"var(--danger)", fontWeight:600 }}>Inactive</span>}
                </div>
                <div style={{ fontSize:12.5, color:"var(--muted)", marginTop:3 }}>{acc.email}</div>
                {acc.phone && <div style={{ fontSize:12, color:"var(--muted)" }}>{acc.phone}</div>}
              </div>
              {/* Created */}
              <div style={{ fontSize:11.5, color:"var(--muted)", textAlign:"right", flexShrink:0 }}>
                <div>Created by</div>
                <div style={{ fontWeight:600, color:"var(--ink)" }}>{acc.created_by || "—"}</div>
                <div>{acc.created_at ? new Date(acc.created_at).toLocaleDateString() : ""}</div>
              </div>
              {/* Actions — not shown for head admin row */}
              {acc.role !== "head" && (
                <div style={{ display:"flex", gap:6, flexShrink:0 }}>
                  <button className="btn btn-ghost" style={{ padding:"5px 10px", fontSize:12 }}
                    onClick={() => { setResetTarget(acc); setNewPw(""); }}>
                    Reset PW
                  </button>
                  <button className="btn btn-secondary" style={{ padding:"5px 10px", fontSize:12 }}
                    onClick={() => toggleActive(acc)}>
                    {acc.is_active ? "Deactivate" : "Activate"}
                  </button>
                  <button className="btn btn-danger" style={{ padding:"5px 10px", fontSize:12 }}
                    onClick={() => handleDelete(acc)}>
                    Delete
                  </button>
                </div>
              )}
            </div>
          ))}
          {accounts.length === 0 && (
            <div style={{ color:"var(--muted)", fontSize:13, textAlign:"center", padding:"30px 0" }}>
              No accounts yet. Create one above.
            </div>
          )}
        </div>
      )}

      {/* Password reset modal */}
      {resetTarget && (
        <div style={{
          position:"fixed", inset:0, zIndex:1000,
          background:"rgba(0,0,0,0.35)", backdropFilter:"blur(6px)",
          display:"flex", alignItems:"center", justifyContent:"center", padding:20,
        }} onClick={e=>{ if(e.target===e.currentTarget) setResetTarget(null); }}>
          <div className="card fade-up" style={{ maxWidth:380, width:"100%", padding:"28px 24px" }}>
            <h3 style={{ fontSize:16, fontWeight:700, marginBottom:6 }}>Reset Password</h3>
            <p style={{ fontSize:13, color:"var(--muted)", marginBottom:16 }}>
              Setting new password for <strong>{resetTarget.name}</strong>
            </p>
            <label>New Password</label>
            <input type="password" value={newPw} onChange={e=>setNewPw(e.target.value)}
              placeholder="Min. 6 characters" style={{ marginBottom:8 }} />
            <PasswordStrength password={newPw} />
            <div style={{ display:"flex", gap:8, marginTop:16 }}>
              <button className="btn btn-primary" style={{ flex:1 }} onClick={handleResetPw}>Save</button>
              <button className="btn btn-secondary" style={{ flex:1 }} onClick={()=>setResetTarget(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
