import { useState, useEffect } from "react";
import { useAIInsight } from "../hooks/useAIInsight";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtMoney(n) {
  if (!n && n !== 0) return "—";
  return "₹" + Math.round(n).toLocaleString("en-IN");
}

function timeAgo(date) {
  if (!date) return null;
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 5) return "just now";
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function AIIcon({ animated = true }) {
  return (
    <div className="ai-icon-wrap" aria-hidden="true">
      <div className={`ai-icon-ring ${animated ? "ai-ring-spin" : ""}`} />
      <div className="ai-icon-core">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 0 2h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1 0-2h1a7 7 0 0 1 7-7h1V5.73A2 2 0 0 1 10 4a2 2 0 0 1 2-2z"/>
          <circle cx="7.5" cy="13.5" r="1.5" fill="currentColor" stroke="none"/>
          <circle cx="16.5" cy="13.5" r="1.5" fill="currentColor" stroke="none"/>
          <path d="M9 18c.83.63 1.94 1 3 1s2.17-.37 3-1"/>
        </svg>
      </div>
    </div>
  );
}

function TrendBadge({ trend, changePct }) {
  const cfg = {
    up: { icon: "↑", label: `+${Math.abs(changePct ?? 0)}%`, cls: "ai-trend-up" },
    down: { icon: "↓", label: `-${Math.abs(changePct ?? 0)}%`, cls: "ai-trend-down" },
    stable: { icon: "→", label: "Stable", cls: "ai-trend-stable" },
  }[trend] || { icon: "→", label: "—", cls: "ai-trend-stable" };

  return (
    <span className={`ai-trend-badge ${cfg.cls}`}>
      <span className="ai-trend-arrow">{cfg.icon}</span>
      {cfg.label}
    </span>
  );
}

function PriorityBadge({ priority }) {
  const map = {
    high: { label: "High Priority", cls: "ai-priority-high" },
    medium: { label: "Medium Priority", cls: "ai-priority-medium" },
    low: { label: "Low Priority", cls: "ai-priority-low" },
  };
  const cfg = map[priority] || map.medium;
  return <span className={`ai-priority-badge ${cfg.cls}`}>{cfg.label}</span>;
}

function MetricPill({ label, value, sub }) {
  return (
    <div className="ai-metric-pill">
      <div className="ai-metric-value">{value}</div>
      <div className="ai-metric-label">{label}</div>
      {sub && <div className="ai-metric-sub">{sub}</div>}
    </div>
  );
}

// ─── Skeleton Loading ─────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="ai-insight-card ai-insight-skeleton" role="status" aria-label="Loading AI insight">
      <div className="ai-insight-header">
        <div className="ai-icon-wrap ai-skeleton-block" style={{ width: 44, height: 44, borderRadius: "50%" }} />
        <div style={{ flex: 1 }}>
          <div className="ai-skeleton-block" style={{ height: 12, width: 140, marginBottom: 8 }} />
          <div className="ai-skeleton-block" style={{ height: 20, width: "65%" }} />
        </div>
        <div className="ai-skeleton-block" style={{ height: 24, width: 80, borderRadius: 20 }} />
      </div>
      <div style={{ padding: "0 0 4px" }}>
        <div className="ai-skeleton-block" style={{ height: 13, width: "95%", marginBottom: 8 }} />
        <div className="ai-skeleton-block" style={{ height: 13, width: "88%", marginBottom: 8 }} />
        <div className="ai-skeleton-block" style={{ height: 13, width: "72%" }} />
      </div>
      <div className="ai-recommendation-block ai-skeleton-block" style={{ height: 48 }} />
      <div className="ai-metrics-strip">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="ai-metric-pill ai-skeleton-block" style={{ height: 60 }} />
        ))}
      </div>
    </div>
  );
}

// ─── Main Card ────────────────────────────────────────────────────────────────

export default function AIInsightCard({ onViewAnalytics }) {
  const { insight, loading, error, refresh, lastUpdated } = useAIInsight();
  const [refreshing, setRefreshing] = useState(false);
  const [timeAgoStr, setTimeAgoStr] = useState(null);

  // Update "X min ago" label every 30 seconds
  useEffect(() => {
    if (!lastUpdated) return;
    setTimeAgoStr(timeAgo(lastUpdated));
    const id = setInterval(() => setTimeAgoStr(timeAgo(lastUpdated)), 30_000);
    return () => clearInterval(id);
  }, [lastUpdated]);

  const handleRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await refresh();
    } finally {
      setRefreshing(false);
    }
  };

  if (loading && !insight) {
    return <SkeletonCard />;
  }

  // Extract analytics for metric pills
  const a = insight?.analytics;
  const today = a?.today;
  const derived = a?.derived;

  const changePct = derived?.checkInChangePct ?? 0;
  const trend = insight?.trend || derived?.trend || "stable";

  return (
    <div className="ai-insight-card fade-up" role="region" aria-label="AI Operations Overview">
      {/* ── Header ── */}
      <div className="ai-insight-header">
        <AIIcon animated={!loading} />

        <div className="ai-insight-heading-group">
          <div className="ai-label-row">
            <span className="ai-label-text" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="4" y="4" width="16" height="16" rx="2" />
                <rect x="9" y="9" width="6" height="6" rx="1" fill="currentColor" fillOpacity="0.1" />
                <path d="M9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 15h3M1 9h3M1 15h3" />
              </svg>
              AI Operations Overview
            </span>
          </div>
          <h2 className="ai-insight-title">
            {insight?.title || "Analysing parking data…"}
          </h2>
        </div>

        <div className="ai-header-right">
          <PriorityBadge priority={insight?.priority || "medium"} />
          {lastUpdated && (
            <div className="ai-last-updated">
              <span className="ai-dot" />
              {timeAgoStr || "just now"}
            </div>
          )}
        </div>
      </div>

      {/* ── Trend Badge ── */}
      {trend && (
        <div className="ai-trend-row">
          <TrendBadge trend={trend} changePct={changePct} />
          {derived?.revenueChangePct !== undefined && (
            <span className="ai-trend-secondary">
              Revenue {derived.revenueChangePct >= 0 ? "▲" : "▼"} {Math.abs(derived.revenueChangePct)}% vs yesterday
            </span>
          )}
        </div>
      )}

      {/* ── Summary ── */}
      <p className="ai-summary-text">
        {insight?.summary || "Generating operational summary…"}
      </p>

      {/* ── Recommendation ── */}
      {insight?.recommendation && (
        <div className="ai-recommendation-block">
          <div className="ai-rec-label">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/>
              <path d="M12 8v4M12 16h.01"/>
            </svg>
            Recommendation
          </div>
          <p className="ai-rec-text">{insight.recommendation}</p>
        </div>
      )}

      {/* ── Divider ── */}
      <div className="ai-divider" />

      {/* ── Metrics Strip ── */}
      {today && (
        <div className="ai-metrics-strip">
          <MetricPill
            label="Trend"
            value={changePct >= 0 ? `+${changePct}%` : `${changePct}%`}
            sub="vs yesterday"
          />
          <MetricPill
            label="Revenue"
            value={fmtMoney(today.revenue)}
            sub="today"
          />
          <MetricPill
            label="Occupancy"
            value={`${today.occupancyPct}%`}
            sub={`${today.currentOccupancy}/${today.totalSlots} slots`}
          />
          <MetricPill
            label="Peak Hour"
            value={today.peakHour || "—"}
            sub={today.peakHour && today.peakHourCount ? `${today.peakHourCount} entries` : undefined}
          />
          <MetricPill
            label="Confidence"
            value={insight?.confidence !== undefined ? `${insight.confidence}%` : "—"}
            sub="AI accuracy"
          />
        </div>
      )}

      {/* ── Error banner (non-blocking) ── */}
      {error && (
        <div className="ai-error-bar" role="alert">
          <span>⚠ Could not reach AI service. Showing cached or fallback data.</span>
        </div>
      )}

      {/* ── Action buttons ── */}
      <div className="ai-actions">
        <button
          id="ai-refresh-btn"
          className="btn btn-secondary ai-btn-refresh"
          onClick={handleRefresh}
          disabled={refreshing || loading}
          aria-label="Refresh AI insight"
        >
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            style={{
              animation: refreshing ? "spin 0.7s linear infinite" : "none",
              transition: "transform 0.3s ease",
            }}
            aria-hidden="true"
          >
            <path d="M23 4v6h-6" />
            <path d="M1 20v-6h6" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
          {refreshing ? "Refreshing…" : "Refresh Insight"}
        </button>

        {onViewAnalytics && (
          <button
            id="ai-view-analytics-btn"
            className="btn btn-ghost ai-btn-analytics"
            onClick={onViewAnalytics}
            aria-label="View detailed analytics"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
            View Analytics
          </button>
        )}
      </div>
    </div>
  );
}
