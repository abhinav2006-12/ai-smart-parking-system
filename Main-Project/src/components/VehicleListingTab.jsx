import { useState, useMemo, useEffect } from "react";
import { fmtMoney, fmtDateTime, formatDuration } from "../lib/format";

const PAGE_SIZE = 8;

export default function VehicleListingTab({ store }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    return store.vehicles
      .filter((v) => {
        if (search && !v.number.toLowerCase().includes(search.toLowerCase())) return false;
        if (statusFilter !== "all" && v.status !== statusFilter) return false;
        if (typeFilter !== "all" && v.type !== typeFilter) return false;
        return true;
      })
      .sort((a, b) => b.entryTime - a.entryTime);
  }, [store.vehicles, search, statusFilter, typeFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, typeFilter]);

  return (
    <div className="fade-up">
      <div className="card" style={{ padding: "20px", boxShadow: "var(--shadow-sm)" }}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 18 }}>
          <div style={{ flex: "2 1 220px" }}>
            <input type="text" placeholder="Search vehicle number…" value={search} onChange={(e) => setSearch(e.target.value)} className="mono" />
          </div>
          <div style={{ flex: "1 1 140px" }}>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">All Status</option>
              <option value="parked">Parked</option>
              <option value="completed">Completed</option>
            </select>
          </div>
          <div style={{ flex: "1 1 140px" }}>
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              <option value="all">All Types</option>
              <option value="standard">Standard</option>
              <option value="ev">EV</option>
              <option value="disabled">Disabled</option>
            </select>
          </div>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
            <thead>
              <tr style={{ textAlign: "left", borderBottom: "1px solid var(--border)" }}>
                {["Number", "Type", "Entry", "Exit", "Duration", "Fee", "Status"].map((h) => (
                  <th key={h} style={{ padding: "10px 8px", color: "var(--muted)", fontWeight: 600, fontSize: 11.5, letterSpacing: ".01em" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageItems.map((v) => (
                <tr key={v.id} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td className="mono" style={{ padding: "12px 8px", fontWeight: 600 }}>
                    {v.number}
                  </td>
                  <td style={{ padding: "12px 8px", textTransform: "capitalize" }}>{v.type}</td>
                  <td style={{ padding: "12px 8px", color: "var(--muted)" }}>{fmtDateTime(v.entryTime)}</td>
                  <td style={{ padding: "12px 8px", color: "var(--muted)" }}>{v.exitTime ? fmtDateTime(v.exitTime) : "—"}</td>
                  <td style={{ padding: "12px 8px", color: "var(--muted)" }}>{v.durationMins ? formatDuration(v.durationMins) : "—"}</td>
                  <td style={{ padding: "12px 8px", fontWeight: 600 }}>{v.fee ? fmtMoney(v.fee) : "—"}</td>
                  <td style={{ padding: "12px 8px" }}>
                    <span
                      className="badge"
                      style={{
                        background: v.status === "parked" ? "var(--warning-soft)" : "var(--success-soft)",
                        color: v.status === "parked" ? "var(--warning)" : "var(--success)",
                      }}
                    >
                      {v.status === "parked" ? "Parked" : "Completed"}
                    </span>
                  </td>
                </tr>
              ))}
              {pageItems.length === 0 && (
                <tr>
                  <td colSpan="7" style={{ padding: "30px 8px", textAlign: "center", color: "var(--muted)" }}>
                    No vehicles match these filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 16 }}>
          <span style={{ fontSize: 12.5, color: "var(--muted)" }}>
            {filtered.length} result{filtered.length !== 1 ? "s" : ""}
          </span>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="btn btn-secondary" style={{ padding: "7px 14px", fontSize: 13 }}>
              Prev
            </button>
            <span style={{ fontSize: 12.5, color: "var(--muted)" }}>
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="btn btn-secondary"
              style={{ padding: "7px 14px", fontSize: 13 }}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
