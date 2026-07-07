import { useState, useMemo, useEffect } from "react";
import { fmtMoney, fmtDateTime, formatDuration } from "../lib/format";
import { getStayCategory, formatDurationShort, calculateLongStayAnalytics } from "../lib/longStayRules";
import LongStaySummaryCard from "./LongStaySummaryCard";
import LongStayAnalytics from "./LongStayAnalytics";
import VehicleInsightModal from "./VehicleInsightModal";

const PAGE_SIZE = 15;

export default function VehicleListingTab({ store, onRefresh }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState(null);
  const [selectedVehicle, setSelectedVehicle] = useState(null);

  // Compute long-stay analytics. Will recalculate when vehicles list changes.
  const longStayAnalytics = useMemo(() => {
    return calculateLongStayAnalytics(store.vehicles, Date.now());
  }, [store.vehicles]);

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
      <LongStaySummaryCard analytics={longStayAnalytics} />
      <LongStayAnalytics analytics={longStayAnalytics} />

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
                {["Number", "Type", "Entry", "Exit", "Duration", "Fee", "Status", "Status / Insight"].map((h) => (
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
                      {v.status === "parked" ? "Parked" : "Checked Out"}
                    </span>
                  </td>
                  <td style={{ padding: "12px 8px" }}>
                    {(() => {
                      const isParked = v.status === "parked";
                      if (!isParked) return <span style={{ color: "var(--muted)" }}>—</span>;
                      const durationMs = Date.now() - v.entryTime;
                      const stayCategory = getStayCategory(durationMs);
                      const shortDurationStr = formatDurationShort(durationMs);
                      const hasLongStayInsight = durationMs > 5 * 24 * 60 * 60 * 1000;

                      return (
                        <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-start" }}>
                          <span
                            className="badge"
                            style={{
                              ...stayCategory.style,
                              fontSize: "11px",
                              fontWeight: "700",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px"
                            }}
                          >
                            <span
                              style={{
                                width: "6px",
                                height: "6px",
                                borderRadius: "50%",
                                backgroundColor: "currentColor",
                                boxShadow: "0 0 5px currentColor",
                                display: "inline-block"
                              }}
                            />
                            {stayCategory.label} ({shortDurationStr})
                          </span>
                          {hasLongStayInsight && (
                            <button
                              onClick={() => setSelectedVehicle(v)}
                              style={{
                                background: "transparent",
                                border: "none",
                                padding: "2px 0",
                                color: "var(--accent)",
                                fontSize: "11.5px",
                                fontWeight: "600",
                                cursor: "pointer",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                textDecoration: "underline",
                                textDecorationColor: "rgba(var(--accent-rgb), 0.3)"
                              }}
                              title="View AI Insight"
                            >
                              <span>ⓘ</span> View Insight
                            </button>
                          )}
                        </div>
                      );
                    })()}
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
      {selectedVehicle && (
        <VehicleInsightModal
          vehicle={selectedVehicle}
          settings={store.settings}
          onClose={() => setSelectedVehicle(null)}
        />
      )}
    </div>
  );
}
