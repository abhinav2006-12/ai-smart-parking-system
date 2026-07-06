import { useState, useEffect, useCallback } from "react";
import { fetchActivityLog } from "../lib/activityLog";

const ROLE_COLORS = {
  head:         "#6366F1",
  gate_manager: "#0EA5E9",
  security:     "#10B981",
};

const ROLE_LABELS = {
  head:         "Head Admin",
  gate_manager: "Gate Manager",
  security:     "Security",
};

function fmtTime(ts) {
  const d = new Date(ts);
  return d.toLocaleString("en-IN", {
    day:"2-digit", month:"short", year:"numeric",
    hour:"2-digit", minute:"2-digit", hour12:true,
  });
}

function ActionIcon({ action }) {
  const a = action.toLowerCase();
  if (a.includes("login"))   return <span style={{ fontSize:16 }}>🔐</span>;
  if (a.includes("logout"))  return <span style={{ fontSize:16 }}>🚪</span>;
  if (a.includes("check-in") || a.includes("checked in"))  return <span style={{ fontSize:16 }}>🟢</span>;
  if (a.includes("check-out") || a.includes("checked out")) return <span style={{ fontSize:16 }}>🔴</span>;
  if (a.includes("rate") || a.includes("settings")) return <span style={{ fontSize:16 }}>⚙️</span>;
  if (a.includes("account")) return <span style={{ fontSize:16 }}>👤</span>;
  if (a.includes("wipe") || a.includes("delete")) return <span style={{ fontSize:16 }}>🗑️</span>;
  if (a.includes("password")) return <span style={{ fontSize:16 }}>🔑</span>;
  return <span style={{ fontSize:16 }}>📋</span>;
}

export default function ActivityLogTab() {
  const [logs, setLogs]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");
  const [filter, setFilter]   = useState("all"); // all | head | gate_manager | security
  const [search, setSearch]   = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setLogs(await fetchActivityLog(300));
    } catch(e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = logs.filter(l => {
    if (filter !== "all" && l.admin_role !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      return l.admin_name?.toLowerCase().includes(q) ||
             l.admin_email?.toLowerCase().includes(q) ||
             l.action?.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="fade-up" style={{ display:"flex", flexDirection:"column", gap:20 }}>
      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:10 }}>
        <div>
          <h2 className="display" style={{ fontSize:20, fontWeight:700, margin:0 }}>Activity Log</h2>
          <p style={{ color:"var(--muted)", fontSize:13, marginTop:4 }}>
            All admin actions across every account. Visible to Head Admin only.
          </p>
        </div>
        <button className="btn btn-secondary" onClick={load} style={{ fontSize:13 }}>↻ Refresh</button>
      </div>

      {/* Filters */}
      <div style={{ display:"flex", gap:10, flexWrap:"wrap", alignItems:"center" }}>
        <input
          type="search"
          placeholder="Search action, name, email…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex:1, minWidth:200, padding:"8px 12px", borderRadius:"var(--radius-sm)", border:"1px solid var(--border)", background:"var(--surface)", color:"var(--ink)", fontSize:13 }}
        />
        {["all","head","gate_manager","security"].map(r => (
          <button key={r}
            onClick={() => setFilter(r)}
            className={filter===r ? "btn btn-primary" : "btn btn-secondary"}
            style={{ padding:"6px 14px", fontSize:12, fontWeight:600 }}>
            {r === "all" ? "All Roles" : ROLE_LABELS[r]}
          </button>
        ))}
      </div>

      {/* Stats row */}
      <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
        {[
          { label:"Total Actions", value: logs.length },
          { label:"Today", value: logs.filter(l => new Date(l.created_at).toDateString()===new Date().toDateString()).length },
          { label:"This Week", value: logs.filter(l => Date.now()-new Date(l.created_at).getTime() < 7*86400000).length },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding:"12px 18px", boxShadow:"var(--shadow-sm)", flex:1, minWidth:120 }}>
            <div style={{ fontSize:22, fontWeight:800, color:"var(--ink)" }}>{s.value}</div>
            <div style={{ fontSize:12, color:"var(--muted)", marginTop:2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Log timeline */}
      {loading ? (
        <div style={{ color:"var(--muted)", fontSize:13, padding:"20px 0" }}>Loading activity log…</div>
      ) : error ? (
        <div style={{ color:"var(--danger)", fontSize:13 }}>⚠ {error}</div>
      ) : filtered.length === 0 ? (
        <div style={{ color:"var(--muted)", fontSize:13, textAlign:"center", padding:"40px 0" }}>
          No activity found.
        </div>
      ) : (
        <div className="card" style={{ padding:0, overflow:"hidden", boxShadow:"var(--shadow-sm)" }}>
          {filtered.map((log, i) => {
            const roleColor = ROLE_COLORS[log.admin_role] || "#94A3B8";
            return (
              <div key={log.id} style={{
                display:"flex", gap:14, padding:"14px 20px", alignItems:"flex-start",
                borderBottom: i < filtered.length-1 ? "1px solid var(--border)" : "none",
              }}>
                {/* Icon */}
                <div style={{ width:36, height:36, borderRadius:"50%", flexShrink:0,
                  background:`${roleColor}12`, display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <ActionIcon action={log.action} />
                </div>
                {/* Content */}
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
                    <span style={{ fontWeight:700, fontSize:13.5, color:"var(--ink)" }}>{log.action}</span>
                  </div>
                  {log.detail && (
                    <div style={{ fontSize:11.5, color:"var(--muted)", marginTop:3, fontFamily:"monospace",
                      background:"var(--surface-muted)", padding:"3px 8px", borderRadius:5, display:"inline-block" }}>
                      {typeof log.detail === "object"
                        ? Object.entries(log.detail).map(([k,v]) => `${k}: ${v}`).join(" · ")
                        : String(log.detail)}
                    </div>
                  )}
                  <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:5, flexWrap:"wrap" }}>
                    <span style={{
                      fontSize:11, fontWeight:700, padding:"1px 8px", borderRadius:12,
                      background:`${roleColor}15`, color:roleColor, border:`1px solid ${roleColor}25`,
                    }}>{ROLE_LABELS[log.admin_role] || log.admin_role}</span>
                    <span style={{ fontSize:12, color:"var(--muted)" }}>{log.admin_name}</span>
                    <span style={{ fontSize:12, color:"var(--muted)", opacity:.7 }}>{log.admin_email}</span>
                  </div>
                </div>
                {/* Time */}
                <div style={{ fontSize:11.5, color:"var(--muted)", textAlign:"right", flexShrink:0, whiteSpace:"nowrap" }}>
                  {fmtTime(log.created_at)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
