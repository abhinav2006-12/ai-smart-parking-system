export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function fmtMoney(n) {
  return "₹" + Math.round(n).toLocaleString("en-IN");
}

export function fmtDateTime(ts) {
  if (!ts) return "—";
  const d = new Date(ts);
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function isSameDay(ts, refDate) {
  const d = new Date(ts);
  return (
    d.getFullYear() === refDate.getFullYear() &&
    d.getMonth() === refDate.getMonth() &&
    d.getDate() === refDate.getDate()
  );
}

export function durationMinutes(start, end) {
  return Math.max(1, Math.round((end - start) / 60000));
}

export function formatDuration(mins) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h <= 0) return `${m} min`;
  return `${h} hr ${m} min`;
}

export function buildUpiUri(settings, amount, note) {
  const params = new URLSearchParams({
    pa: settings.upiVpa,
    pn: settings.upiPayeeName,
    am: amount.toFixed(2),
    cu: "INR",
    tn: `Parking fee ${note}`,
  });
  return `upi://pay?${params.toString()}`;
}
