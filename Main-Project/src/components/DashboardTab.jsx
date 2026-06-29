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

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div
        className="card"
        style={{
          padding: "10px 12px",
          boxShadow: "var(--shadow-md)",
          fontSize: 13,
          background: "var(--surface)",
          border: "1px solid var(--border)",
        }}
      >
        <div style={{ fontWeight: 600, color: "var(--muted)", marginBottom: 4 }}>
          {data.dayLabel}
        </div>
        <div style={{ fontWeight: 700, color: "var(--ink)", display: "flex", alignItems: "center", gap: 6 }}>
          Revenue: <span style={{ color: "var(--accent)" }}>{fmtMoney(data.revenue)}</span>
        </div>
        <div
          style={{
            marginTop: 4,
            fontWeight: 600,
            color: data.isProfit ? "var(--success)" : "var(--danger)",
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          {data.isProfit ? "▲ Profit: +" : "▼ Loss: "}
          {fmtMoney(Math.abs(data.change))}
        </div>
      </div>
    );
  }
  return null;
};

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
    const refDate = new Date(now);
    refDate.setDate(now.getDate() - 7);
    let prevRevenue = store.revenueLog
      .filter((r) => isSameDay(r.date, refDate))
      .reduce((s, r) => s + r.amount, 0);

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const total = store.revenueLog
        .filter((r) => isSameDay(r.date, d))
        .reduce((s, r) => s + r.amount, 0);
      
      const change = total - prevRevenue;
      const isProfit = change >= 0;
      
      days.push({
        day: d.toLocaleDateString("en-IN", { weekday: "short" }),
        dayLabel: d.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short" }),
        revenue: total,
        change,
        isProfit,
        color: isProfit ? "var(--success)" : "var(--danger)",
      });
      
      prevRevenue = total;
    }
    return days;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.revenueLog]);

  const activeStandard = store.vehicles.filter((v) => v.status === "parked" && v.type === "standard").length;
  const activeEV = store.vehicles.filter((v) => v.status === "parked" && v.type === "ev").length;
  const activeDisabled = store.vehicles.filter((v) => v.status === "parked" && v.type === "disabled").length;

  const remainingStandard = Math.max(0, store.settings.slotsByType.standard - activeStandard);
  const remainingEV = Math.max(0, store.settings.slotsByType.ev - activeEV);
  const remainingDisabled = Math.max(0, store.settings.slotsByType.disabled - activeDisabled);

  const slotTypeData = useMemo(() => {
    return [
      { name: "Standard", value: remainingStandard, color: "#E53935" },
      { name: "EV", value: remainingEV, color: "#1E88E5" },
      { name: "Disabled", value: remainingDisabled, color: "#43A047" },
    ];
  }, [remainingStandard, remainingEV, remainingDisabled]);

  const selectedSlot = selectedSlotType || { name: "Available", value: emptySlots };

  const topStats = [
    { label: "Total Vehicles", value: totalVehicles, color: "var(--ink)" },
    { label: "Active Parking", value: activeParking, color: "var(--ink)" },
    { label: "Empty Slots", value: `${emptySlots} / ${totalSlots}`, color: emptySlots === 0 ? "var(--danger)" : "var(--ink)" },
  ];

  const bottomStats = [
    { label: "Left Today", value: leftToday, color: "var(--ink)" },
    { label: "Revenue Today", value: fmtMoney(revenueToday), color: "var(--success)" },
    { label: "Revenue Yesterday", value: fmtMoney(revenueYesterday), color: "var(--muted)" },
  ];

  return (
    <div className="fade-up">
      {/* Top primary widgets */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
        {topStats.map((s, i) => (
          <div key={i} className="card" style={{ padding: "22px 24px", boxShadow: "var(--shadow-sm)" }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--muted)", letterSpacing: ".01em" }}>{s.label}</div>
            <div className="display" style={{ fontSize: 32, fontWeight: 600, marginTop: 10, color: s.color }}>
              {s.value}
            </div>
          </div>
        ))}
      </div>

      {/* Bottom secondary widgets */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginTop: 16 }}>
        {bottomStats.map((s, i) => (
          <div key={i} className="card" style={{ padding: "22px 24px", boxShadow: "var(--shadow-sm)" }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--muted)", letterSpacing: ".01em" }}>{s.label}</div>
            <div className="display" style={{ fontSize: 32, fontWeight: 600, marginTop: 10, color: s.color }}>
              {s.value}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16, marginTop: 20 }}>
        <div className="card" style={{ padding: "20px", boxShadow: "var(--shadow-sm)" }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--muted)", marginBottom: 14 }}>Revenue — Last 7 Days</div>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={ACCENT} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={ACCENT} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#ECECE9" />
              <XAxis dataKey="day" tick={{ fontSize: 12, fill: "#6B7280" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: "#6B7280" }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke={ACCENT}
                strokeWidth={2}
                fill="url(#revGrad)"
                dot={({ cx, cy, payload }) => (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={5}
                    fill={payload.color}
                    stroke="var(--surface)"
                    strokeWidth={2}
                  />
                )}
                activeDot={({ cx, cy, payload }) => (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={7}
                    fill={payload.color}
                    stroke="var(--surface)"
                    strokeWidth={2}
                    style={{ filter: "drop-shadow(0px 2px 4px rgba(0,0,0,0.15))" }}
                  />
                )}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="card" style={{ padding: "20px", boxShadow: "var(--shadow-sm)" }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--muted)", marginBottom: 14 }}>Available Slots by Type</div>
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
    </div>
  );
}
