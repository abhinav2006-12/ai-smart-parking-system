<<<<<<< HEAD
import { useMemo } from "react";
=======
import { useMemo, useState } from "react";
>>>>>>> razin
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
<<<<<<< HEAD
=======
  const [selectedSlotType, setSelectedSlotType] = useState(null);
>>>>>>> razin
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

<<<<<<< HEAD
  const typeData = useMemo(() => {
    const counts = { standard: 0, ev: 0, disabled: 0 };
    store.vehicles.filter((v) => v.status === "parked").forEach((v) => {
      counts[v.type] = (counts[v.type] || 0) + 1;
    });
    return [
      { name: "Standard", value: counts.standard, color: "#2F4858" },
      { name: "EV", value: counts.ev, color: "#6B8A99" },
      { name: "Disabled", value: counts.disabled, color: "#C7CDD1" },
    ];
  }, [store.vehicles]);
=======
  const slotTypeData = useMemo(() => {
    return [
      { name: "Standard", value: store.settings.slotsByType.standard, color: "#E53935" },
      { name: "EV", value: store.settings.slotsByType.ev, color: "#1E88E5" },
      { name: "Disabled", value: store.settings.slotsByType.disabled, color: "#43A047" },
    ];
  }, [store.settings.slotsByType]);

  const selectedSlot = selectedSlotType || { name: "Total", value: totalSlots };
>>>>>>> razin

  const stats = [
    { label: "Total Vehicles", value: totalVehicles, color: "var(--ink)" },
    { label: "Active Parking", value: activeParking, color: "var(--ink)" },
    { label: "Left Today", value: leftToday, color: "var(--ink)" },
    { label: "Empty Slots", value: `${emptySlots} / ${totalSlots}`, color: emptySlots === 0 ? "var(--danger)" : "var(--ink)" },
    { label: "Revenue Today", value: fmtMoney(revenueToday), color: "var(--success)" },
    { label: "Revenue Yesterday", value: fmtMoney(revenueYesterday), color: "var(--muted)" },
  ];

  return (
    <div className="fade-up">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 14 }}>
        {stats.map((s, i) => (
          <div key={i} className="card" style={{ padding: "16px 18px", boxShadow: "var(--shadow-sm)" }}>
            <div style={{ fontSize: 11.5, fontWeight: 600, color: "var(--muted)", letterSpacing: ".01em" }}>{s.label}</div>
            <div className="display" style={{ fontSize: 24, fontWeight: 600, marginTop: 8, color: s.color }}>
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
              <Tooltip formatter={(v) => fmtMoney(v)} contentStyle={{ borderRadius: 8, border: "1px solid #E4E4E2" }} />
              <Area type="monotone" dataKey="revenue" stroke={ACCENT} strokeWidth={2} fill="url(#revGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="card" style={{ padding: "20px", boxShadow: "var(--shadow-sm)" }}>
<<<<<<< HEAD
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--muted)", marginBottom: 14 }}>Active by Type</div>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={typeData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={3}>
                {typeData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
=======
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
>>>>>>> razin
                ))}
              </Pie>
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
<<<<<<< HEAD
          </ResponsiveContainer>
=======
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
>>>>>>> razin
        </div>
      </div>
    </div>
  );
}
