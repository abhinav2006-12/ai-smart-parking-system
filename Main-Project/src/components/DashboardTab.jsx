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

export default function DashboardTab({ store }) {
  const [selectedSlotType, setSelectedSlotType] = useState(null);
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
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const total = store.revenueLog.filter((r) => isSameDay(r.date, d)).reduce((s, r) => s + r.amount, 0);

      // Simulated operating costs/losses baseline + slight variance
      const simulatedLoss = total > 0
        ? Math.round(total * 0.2 + 80 + (d.getDate() % 4) * 30)
        : Math.round(120 + (d.getDate() % 4) * 30);

      days.push({
        day: d.toLocaleDateString("en-IN", { weekday: "short" }),
        profit: total,
        loss: simulatedLoss,
      });
    }
    return days;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.revenueLog]);

  const slotTypeData = useMemo(() => {
    const occupied = { standard: 0, ev: 0, disabled: 0 };
    store.vehicles.filter((v) => v.status === "parked").forEach((v) => {
      occupied[v.type] = (occupied[v.type] || 0) + 1;
    });

    return [
      { name: "Standard", value: Math.max(0, (store.settings.slotsByType.standard || 0) - (occupied.standard || 0)), color: "#E53935" },
      { name: "EV", value: Math.max(0, (store.settings.slotsByType.ev || 0) - (occupied.ev || 0)), color: "#1E88E5" },
      { name: "Disabled", value: Math.max(0, (store.settings.slotsByType.disabled || 0) - (occupied.disabled || 0)), color: "#43A047" },
    ];
  }, [store.settings.slotsByType, store.vehicles]);

  const selectedSlot = selectedSlotType || { name: "Remaining", value: emptySlots };

  const topStats = [
    { label: "Total Vehicles", value: totalVehicles, color: "var(--ink)" },
    { label: "Active Parking", value: activeParking, color: "var(--ink)" },
    { label: "Left Today", value: leftToday, color: "var(--ink)" },
  ];

  const bottomStats = [
    { label: "Empty Slots", value: `${emptySlots} / ${totalSlots}`, color: emptySlots === 0 ? "var(--danger)" : "var(--ink)" },
    { label: "Revenue Today", value: fmtMoney(revenueToday), color: "var(--success)" },
    { label: "Revenue Yesterday", value: fmtMoney(revenueYesterday), color: "var(--muted)" },
  ];

  return (
    <div className="fade-up" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
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
        <div className="card" style={{ padding: "20px", boxShadow: "var(--shadow-sm)" }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--muted)", marginBottom: 14 }}>Profits & Losses — Last 7 Days</div>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#1F7A4D" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#1F7A4D" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="lossGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#C0392B" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#C0392B" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#ECECE9" />
              <XAxis dataKey="day" tick={{ fontSize: 12, fill: "#6B7280" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: "#6B7280" }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v) => fmtMoney(v)} contentStyle={{ borderRadius: 8, border: "1px solid #E4E4E2" }} />
              <Legend wrapperStyle={{ fontSize: 12, marginTop: 4 }} />
              <Area type="monotone" name="Profit" dataKey="profit" stroke="#1F7A4D" strokeWidth={2} fill="url(#profitGrad)" />
              <Area type="monotone" name="Loss" dataKey="loss" stroke="#C0392B" strokeWidth={2} fill="url(#lossGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="card" style={{ padding: "20px", boxShadow: "var(--shadow-sm)" }}>
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
