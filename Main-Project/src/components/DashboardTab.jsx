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
      days.push({ day: d.toLocaleDateString("en-IN", { weekday: "short" }), revenue: total });
    }
    return days;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.revenueLog]);

  const strokeStops = useMemo(() => {
    if (chartData.length < 2) return [];
    const stops = [];
    const firstColor = chartData[1].revenue >= chartData[0].revenue ? "var(--success)" : "var(--danger)";
    stops.push({ offset: "0%", color: firstColor });

    for (let i = 1; i < chartData.length; i++) {
      const prevColor = chartData[i].revenue >= chartData[i - 1].revenue ? "var(--success)" : "var(--danger)";
      const nextColor = i < chartData.length - 1
        ? (chartData[i + 1].revenue >= chartData[i].revenue ? "var(--success)" : "var(--danger)")
        : prevColor;

      const offsetStr = `${(i / (chartData.length - 1)) * 100}%`;
      stops.push({ offset: offsetStr, color: prevColor });
      if (i < chartData.length - 1) {
        stops.push({ offset: offsetStr, color: nextColor });
      }
    }
    return stops;
  }, [chartData]);

  const occupiedByType = useMemo(() => {
    const counts = { standard: 0, ev: 0, disabled: 0 };
    store.vehicles.filter((v) => v.status === "parked").forEach((v) => {
      counts[v.type] = (counts[v.type] || 0) + 1;
    });
    return counts;
  }, [store.vehicles]);

  const slotTypeData = useMemo(() => {
    return [
      { name: "Standard", value: Math.max(0, (store.settings.slotsByType.standard || 0) - occupiedByType.standard), color: "#E53935" },
      { name: "EV", value: Math.max(0, (store.settings.slotsByType.ev || 0) - occupiedByType.ev), color: "#1E88E5" },
      { name: "Disabled", value: Math.max(0, (store.settings.slotsByType.disabled || 0) - occupiedByType.disabled), color: "#43A047" },
    ];
  }, [store.settings.slotsByType, occupiedByType]);

  const selectedSlot = selectedSlotType || { name: "Available", value: emptySlots };

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
    <div className="fade-up">
      {/* Top Maximised Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16, marginBottom: 20 }}>
        {topStats.map((s, i) => (
          <div key={i} className="card" style={{ padding: "20px 24px", boxShadow: "var(--shadow-sm)" }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--muted)", letterSpacing: ".01em" }}>{s.label}</div>
            <div className="display" style={{ fontSize: 32, fontWeight: 600, marginTop: 10, color: s.color }}>
              {s.value}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16 }}>
        <div className="card" style={{ padding: "20px", boxShadow: "var(--shadow-sm)" }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--muted)", marginBottom: 14 }}>Revenue — Last 7 Days</div>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="strokeGrad" x1="0" y1="0" x2="1" y2="0">
                  {strokeStops.map((stop, idx) => (
                    <stop key={idx} offset={stop.offset} stopColor={stop.color} />
                  ))}
                </linearGradient>
                <linearGradient id="fillGrad" x1="0" y1="0" x2="1" y2="0">
                  {strokeStops.map((stop, idx) => (
                    <stop key={idx} offset={stop.offset} stopColor={stop.color} stopOpacity={0.15} />
                  ))}
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#ECECE9" />
              <XAxis
                dataKey="day"
                tick={{ fontSize: 12, fill: "#6B7280" }}
                axisLine={false}
                tickLine={false}
                padding={{ left: 10, right: 10 }}
              />
              <YAxis tick={{ fontSize: 12, fill: "#6B7280" }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v) => fmtMoney(v)} contentStyle={{ borderRadius: 8, border: "1px solid #E4E4E2" }} />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="url(#strokeGrad)"
                strokeWidth={2.5}
                fill="url(#fillGrad)"
                dot={(props) => {
                  const { cx, cy, payload, index } = props;
                  if (index === undefined) return null;
                  const isProfit = index === 0 ? true : payload.revenue >= chartData[index - 1].revenue;
                  return (
                    <circle
                      key={`dot-${index}`}
                      cx={cx}
                      cy={cy}
                      r={5}
                      fill={isProfit ? "var(--success)" : "var(--danger)"}
                      stroke="var(--surface)"
                      strokeWidth={2}
                    />
                  );
                }}
                activeDot={{ r: 6, strokeWidth: 0 }}
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
              <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
                {selectedSlot.name === "Available" ? "Total Available" : `${selectedSlot.name} Available`}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Maximised Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16, marginTop: 20 }}>
        {bottomStats.map((s, i) => (
          <div key={i} className="card" style={{ padding: "20px 24px", boxShadow: "var(--shadow-sm)" }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--muted)", letterSpacing: ".01em" }}>{s.label}</div>
            <div className="display" style={{ fontSize: 32, fontWeight: 600, marginTop: 10, color: s.color }}>
              {s.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
