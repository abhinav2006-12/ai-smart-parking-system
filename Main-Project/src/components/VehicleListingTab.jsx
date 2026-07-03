import { useState, useMemo, useEffect, Fragment } from "react";
import { fmtMoney, fmtDateTime, formatDuration } from "../lib/format";
import { computeVehicleStats } from "../lib/stats";

const PAGE_SIZE = 15;

export default function VehicleListingTab({ store, onRefresh }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState(null);

  const [expandedSummaryId, setExpandedSummaryId] = useState(null);
  const [summaries, setSummaries] = useState({});
  const [loadingSummaryId, setLoadingSummaryId] = useState(null);
  const [errorSummaryId, setErrorSummaryId] = useState(null);

  const stats = useMemo(() => computeVehicleStats(store.vehicles), [store.vehicles]);

  const handleToggleSummary = async (v) => {
    if (expandedSummaryId === v.id) {
      setExpandedSummaryId(null);
      return;
    }

    setExpandedSummaryId(v.id);

    if (summaries[v.id]) return;

    setLoadingSummaryId(v.id);
    setErrorSummaryId(null);

    try {
      const token = localStorage.getItem("parkpilot_admin_token");
      const res = await fetch("/api/chat/summary", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          vehicle: {
            id: v.id,
            number: v.number,
            type: v.type,
            entryTime: v.entryTime,
            exitTime: v.exitTime,
            status: v.status,
            fee: v.fee,
            durationMins: v.durationMins
          },
          stats: {
            duration: stats.duration,
            fee: stats.fee,
            unusualReasons: stats.vehicleOutlierReasons[v.id] || []
          }
        })
      });

      if (!res.ok) {
        throw new Error(`Server error (${res.status})`);
      }

      const data = await res.json();
      setSummaries((prev) => ({ ...prev, [v.id]: data.summary }));
    } catch (err) {
      console.error("[VehicleListingTab] Summary fetch failed:", err);
      setErrorSummaryId(v.id);
    } finally {
      setLoadingSummaryId(null);
    }
  };

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

  const handleRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      if (onRefresh) await onRefresh();
    } finally {
      setRefreshing(false);
      setLastRefreshed(new Date());
      setPage(1);
    }
  };

  return (
    <div className="fade-up">
      <div className="card" style={{ padding: "20px", boxShadow: "var(--shadow-sm)" }}>
        {/* Header row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
          <div>
            <h2 className="display" style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>Vehicle Listing</h2>
            {lastRefreshed && (
              <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 3 }}>
                Last refreshed: {lastRefreshed.toLocaleTimeString()}
              </div>
            )}
          </div>
          <button
            id="vehicle-listing-refresh-btn"
            onClick={handleRefresh}
            disabled={refreshing}
            className="btn btn-secondary"
            title="Refresh vehicle list from database"
            style={{ display: "flex", alignItems: "center", gap: 7, padding: "8px 16px", fontSize: 13, fontWeight: 600, minWidth: 110 }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              style={{
                transition: "transform 0.4s ease",
                transform: refreshing ? "rotate(360deg)" : "rotate(0deg)",
                animation: refreshing ? "spin 0.7s linear infinite" : "none",
              }}
            >
              <path d="M23 4v6h-6" />
              <path d="M1 20v-6h6" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>
        </div>

        {/* Filters */}
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 18 }}>
          <div style={{ flex: "2 1 220px" }}>
            <input type="text" placeholder="Search vehicle number…" value={search} onChange={(e) => setSearch(e.target.value)} className="mono" />
          </div>
          <div style={{ flex: "1 1 140px" }}>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">All Status</option>
              <option value="parked">Parked</option>
              <option value="completed">Checked Out</option>
            </select>
          </div>
          <div style={{ flex: "1 1 140px" }}>
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              <option value="all">All Types</option>
              <option value="standard">Standard</option>
              <option value="ev">EV</option>
              <option value="taxi">Taxi</option>
            </select>
          </div>
          <button
            onClick={() => {
              setSearch("");
              setStatusFilter("all");
              setTypeFilter("all");
              setPage(1);
            }}
            className="btn btn-secondary"
            style={{ flex: "0 0 auto", padding: "8px 16px", fontSize: 13, fontWeight: 600, height: 38, display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            Reset
          </button>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
            <thead>
              <tr style={{ textAlign: "left", borderBottom: "1px solid var(--border)" }}>
                {["Number", "Type", "Entry", "Exit", "Duration", "Fee", "Status", "Actions"].map((h) => (
                  <th key={h} style={{ padding: "10px 8px", color: "var(--muted)", fontWeight: 600, fontSize: 11.5, letterSpacing: ".01em" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageItems.map((v) => {
                const isUnusual = stats.unusualVehicleIds.has(v.id);
                return (
                  <Fragment key={v.id}>
                    <tr style={{ borderBottom: "1px solid var(--border)" }}>
                      <td className="mono" style={{ padding: "12px 8px", fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
                        {v.number}
                        {isUnusual && (
                          <span
                            className="badge"
                            onClick={() => handleToggleSummary(v)}
                            title={`Outlier detected: ${stats.vehicleOutlierReasons[v.id]?.join(", ")}. Click to view AI summary.`}
                            style={{
                              background: "var(--danger-soft)",
                              color: "var(--danger)",
                              fontSize: 10.5,
                              padding: "2px 6px",
                              cursor: "pointer",
                              userSelect: "none"
                            }}
                          >
                            ⚠️ Unusual
                          </span>
                        )}
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
                          {v.status === "parked" ? "Parked" : "Checked Out"}
                        </span>
                      </td>
                      <td style={{ padding: "12px 8px" }}>
                        <button
                          onClick={() => handleToggleSummary(v)}
                          className="btn btn-ghost"
                          style={{
                            padding: "4px 8px",
                            fontSize: 12,
                            fontWeight: 600,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                            cursor: "pointer"
                          }}
                          title="Generate AI summary details for this vehicle"
                        >
                          <span>🪄</span>
                          <span>{expandedSummaryId === v.id ? "Close" : "Summarize"}</span>
                        </button>
                      </td>
                    </tr>
                    {expandedSummaryId === v.id && (
                      <tr key={`${v.id}-summary`} style={{ background: "var(--surface-muted)" }}>
                        <td colSpan="8" style={{ padding: "14px 20px", fontSize: 13.5, borderBottom: "1px solid var(--border)" }}>
                          <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                            <span style={{ fontSize: 16, marginTop: 1 }}>🤖</span>
                            <div style={{ flex: 1 }}>
                              {loadingSummaryId === v.id ? (
                                <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--muted)" }}>
                                  <span
                                    className="spin"
                                    style={{
                                      width: 14,
                                      height: 14,
                                      border: "2px solid var(--border)",
                                      borderTopColor: "var(--accent)",
                                      borderRadius: "50%",
                                      display: "inline-block"
                                    }}
                                  />
                                  <span>Generating AI outlier explanation...</span>
                                </div>
                              ) : errorSummaryId === v.id ? (
                                <div style={{ color: "var(--danger)" }}>
                                  Failed to load summary.{" "}
                                  <button
                                    onClick={() => handleToggleSummary(v)}
                                    className="btn btn-ghost"
                                    style={{ padding: "2px 6px", fontSize: 12, display: "inline-block", color: "var(--accent)" }}
                                  >
                                    Retry
                                  </button>
                                </div>
                              ) : (
                                <div style={{ lineHeight: 1.5, color: "var(--ink)", whiteSpace: "pre-wrap" }}>
                                  {summaries[v.id]}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
              {pageItems.length === 0 && (
                <tr>
                  <td colSpan="8" style={{ padding: "30px 8px", textAlign: "center", color: "var(--muted)" }}>
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
