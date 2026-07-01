import { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { fmtMoney, isSameDay } from "../lib/format";

const ACCENT = "#2F4858";

export default function DashboardTab({ store, onRefresh }) {
  const [selectedSlotType, setSelectedSlotType] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState(null);

  const handleRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      if (onRefresh) await onRefresh();
    } finally {
      setRefreshing(false);
      setLastRefreshed(new Date());
    }
  };

  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  const totalVehicles = store.vehicles.length;
  const activeParking = store.vehicles.filter((v) => v.status === "parked").length;
  const leftToday = store.vehicles.filter((v) => v.status === "completed" && v.exitTime && isSameDay(v.exitTime, now)).length;

  const totalSlots = store.settings.totalSlots;
  const emptySlots = Math.max(0, totalSlots - activeParking);

  const revenueToday = store.revenueLog.filter((r) => isSameDay(r.date, now)).reduce((s, r) => s + r.amount, 0);
  const revenueYesterday = store.revenueLog.filter((r) => isSameDay(r.date, yesterday)).reduce((s, r) => s + r.amount, 0);

  const chartData = useMemo(() => {
    // Build a local-date key "YYYY-MM-DD" from any timestamp (ms number or ISO string)
    const toDateKey = (ts) => {
      if (!ts) return null;
      const d = typeof ts === "number" ? new Date(ts) : new Date(ts);
      if (isNaN(d.getTime())) return null;
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    };

    // Group revenue by local date key
    const revenueByDay = {};
    for (const r of store.revenueLog) {
      const key = toDateKey(r.date);
      if (key) revenueByDay[key] = (revenueByDay[key] || 0) + r.amount;
    }

    const chartNow = new Date();
    const DAILY_OPERATING_COST = 150; // Fixed estimated daily operating cost in ₹

    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(chartNow);
      d.setDate(chartNow.getDate() - (6 - i));
      const key = toDateKey(d.getTime());
      const revenue = revenueByDay[key] || 0;
      return {
        day: d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric" }),
        revenue,
        cost: DAILY_OPERATING_COST,
        net: revenue - DAILY_OPERATING_COST,
      };
    });
  }, [store.revenueLog]);

  const slotTypeData = useMemo(() => {
    const occupied = { standard: 0, ev: 0, taxi: 0 };
    store.vehicles.filter((v) => v.status === "parked").forEach((v) => {
      occupied[v.type] = (occupied[v.type] || 0) + 1;
    });

    return [
      { name: "Standard", value: Math.max(0, (store.settings.slotsByType.standard || 0) - (occupied.standard || 0)), color: "#E53935" },
      { name: "EV", value: Math.max(0, (store.settings.slotsByType.ev || 0) - (occupied.ev || 0)), color: "#1E88E5" },
      { name: "Taxi", value: Math.max(0, (store.settings.slotsByType.taxi || 0) - (occupied.taxi || 0)), color: "#43A047" },
    ];
  }, [store.settings.slotsByType, store.vehicles]);

  const selectedSlot = selectedSlotType || { name: "Remaining", value: emptySlots };

  const topStats = [
    { label: "Total Vehicles", value: totalVehicles, color: "var(--ink)" },
    { label: "Active Parking", value: activeParking, color: "var(--ink)" },
    { label: "Checked Out Today", value: leftToday, color: "var(--ink)" },
  ];

  const bottomStats = [
    { label: "Empty Slots", value: `${emptySlots} / ${totalSlots}`, color: emptySlots === 0 ? "var(--danger)" : "var(--ink)" },
    { label: "Revenue Today", value: fmtMoney(revenueToday), color: "var(--success)" },
    { label: "Revenue Yesterday", value: fmtMoney(revenueYesterday), color: "var(--muted)" },
  ];

  return (
    <div className="fade-up" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header Row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <div>
          <h1 className="display" style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Dashboard Overview</h1>
          {lastRefreshed && (
            <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 3 }}>
              Last refreshed: {lastRefreshed.toLocaleTimeString()}
            </div>
          )}
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="btn btn-secondary"
          title="Refresh dashboard stats from database"
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

      {/* Top Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
        {topStats.map((s, i) => (
          <div key={i} className="card" style={{ padding: "16px 18px", boxShadow: "var(--shadow-sm)" }}>
            <div style={{ fontSize: 11.5, fontWeight: 600, color: "var(--muted)", letterSpacing: ".01em" }}>{s.label}</div>
            <div className="display" style={{ fontSize: 24, fontWeight: 600, marginTop: 8, color: s.color }}>
              {s.value}
            </div>
          </div>
        ))}
      </div>

      {/* Graphs Row */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16 }}>
        <div className="card" style={{ padding: "20px", boxShadow: "var(--shadow-sm)", minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--muted)", marginBottom: 14 }}>Revenue vs Operating Cost — Last 7 Days</div>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#1F7A4D" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#1F7A4D" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="costGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#C0392B" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#C0392B" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="netGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2563EB" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#2563EB" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#ECECE9" />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#6B7280" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: "#6B7280" }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${v}`} />
              <Tooltip formatter={(v, name) => [fmtMoney(v), name]} contentStyle={{ borderRadius: 8, border: "1px solid #E4E4E2", fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12, marginTop: 4 }} />
              <Area type="monotone" name="Revenue" dataKey="revenue" stroke="#1F7A4D" strokeWidth={2.5} fill="url(#revenueGrad)" dot={{ r: 3, fill: "#1F7A4D" }} />
              <Area type="monotone" name="Operating Cost" dataKey="cost" stroke="#C0392B" strokeWidth={1.5} strokeDasharray="5 3" fill="url(#costGrad)" />
              <Area type="monotone" name="Net" dataKey="net" stroke="#2563EB" strokeWidth={2} fill="url(#netGrad)" dot={{ r: 3, fill: "#2563EB" }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="card" style={{ padding: "20px", boxShadow: "var(--shadow-sm)", minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--muted)", marginBottom: 14 }}>Slots by Type</div>
          <div style={{ position: "relative", height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={slotTypeData} dataKey="value" nameKey="name" innerRadius={52} outerRadius={82} paddingAngle={3}>
                {slotTypeData.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={entry.color}
                    opacity={!selectedSlotType || selectedSlotType.name === entry.name ? 1 : 0.45}
                    onClick={() => setSelectedSlotType(entry)}
                    style={{ cursor: "pointer" }}
                  />
                ))}
              </Pie>
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
            </ResponsiveContainer>
            <div
              style={{
                position: "absolute",
                top: "42%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                textAlign: "center",
                pointerEvents: "none",
              }}
            >
              <div className="display" style={{ fontSize: 22, fontWeight: 600 }}>
                {selectedSlot.value}
              </div>
              <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{selectedSlot.name} slots</div>
            </div>
          </div>
        </div>
      </div>

      {/* Maximized Bottom Widgets */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 16 }}>
        {bottomStats.map((s, i) => (
          <div
            key={i}
            className="card"
            style={{
              padding: "24px 28px",
              boxShadow: "var(--shadow-md)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              minHeight: 120,
              background: i === 1 
                ? "linear-gradient(135deg, var(--surface) 0%, var(--success-soft) 100%)" 
                : "var(--surface)",
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--muted)", letterSpacing: ".02em" }}>
              {s.label.toUpperCase()}
            </div>
            <div
              className="display"
              style={{
                fontSize: 34,
                fontWeight: 700,
                marginTop: 12,
                color: s.color,
                letterSpacing: "-0.02em",
              }}
            >
              {s.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
