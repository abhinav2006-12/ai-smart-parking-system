import { supabase } from "../config/supabase.js";

// ─── Utility ──────────────────────────────────────────────────────────────────

/**
 * Normalise a Supabase timestamp (unix-ms, unix-sec, or ISO string) to milliseconds.
 */
function parseDbTime(val) {
  if (!val) return null;
  const num = Number(val);
  if (isNaN(num)) return new Date(val).getTime();
  if (num > 0 && num < 10_000_000_000) return num * 1000; // seconds → ms
  return num;
}

/**
 * Return the start-of-day (00:00:00.000) timestamp in ms for a given Date.
 */
function dayStart(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/**
 * Format an hour number (0-23) into a human-readable label like "10 AM".
 */
function fmtHour(h) {
  if (h === 0) return "12 AM";
  if (h === 12) return "12 PM";
  return h < 12 ? `${h} AM` : `${h - 12} PM`;
}

// ─── Core Queries ─────────────────────────────────────────────────────────────

/**
 * Fetch all vehicles from Supabase (capped at last 7 days + currently parked).
 * We purposely pull everything so we can do all analytics in JS.
 */
async function fetchAllData() {
  if (!supabase) throw new Error("Supabase client not initialised.");

  const sevenDaysAgoMs = dayStart(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const sevenDaysAgoSecs = Math.floor(sevenDaysAgoMs / 1000);

  // Vehicles active in the last 7 days OR currently parked
  const { data: vehiclesRaw, error: vErr } = await supabase
    .from("vehicles")
    .select("id, number, type, entry_time, exit_time, status, fee, duration_mins")
    .or(
      `entry_time.gte.${sevenDaysAgoMs},` +
      `and(entry_time.gte.${sevenDaysAgoSecs},entry_time.lt.10000000000),` +
      `status.in.(parked,Parked)`
    )
    .order("entry_time", { ascending: false });

  if (vErr) throw vErr;

  // Revenue log for last 7 days
  const { data: revenueRaw, error: rErr } = await supabase
    .from("revenue_log")
    .select("id, vehicle_id, amount, date")
    .or(
      `date.gte.${sevenDaysAgoMs},` +
      `and(date.gte.${sevenDaysAgoSecs},date.lt.10000000000)`
    );

  if (rErr) throw rErr;

  // Settings (total slots, slotsByType, rates)
  const { data: settings, error: sErr } = await supabase
    .from("settings")
    .select("total_slots, slots_by_type, rates")
    .eq("id", 1)
    .single();

  if (sErr && sErr.code !== "PGRST116") throw sErr;

  // Normalise vehicles
  const vehicles = (vehiclesRaw || []).map((v) => ({
    id: v.id,
    number: v.number,
    type: (v.type || "standard").toLowerCase(),
    entryTime: parseDbTime(v.entry_time),
    exitTime: parseDbTime(v.exit_time),
    status: (v.status || "").toLowerCase().replace(" ", ""),  // "parked"|"completed"|"cancelled"
    fee: v.fee ? Number(v.fee) : null,
    durationMins: v.duration_mins ? Number(v.duration_mins) : null,
  }));

  // Normalise revenue log
  const revenueLogs = (revenueRaw || []).map((r) => ({
    id: r.id,
    vehicleId: r.vehicle_id,
    amount: Number(r.amount),
    date: parseDbTime(r.date),
  }));

  // Augment revenue log with vehicles that have a fee but no revenue_log entry
  const loggedVehicleIds = new Set(revenueLogs.map((r) => r.vehicleId));
  vehicles.forEach((v) => {
    if (v.status === "completed" && v.fee && v.fee > 0 && !loggedVehicleIds.has(v.id)) {
      revenueLogs.push({
        id: `fallback-${v.id}`,
        vehicleId: v.id,
        amount: v.fee,
        date: v.exitTime || v.entryTime || Date.now(),
      });
    }
  });

  const totalSlots = settings?.total_slots || 50;
  const slotsByType = settings?.slots_by_type || { standard: 40, ev: 5, taxi: 5 };

  return { vehicles, revenueLogs, totalSlots, slotsByType };
}

// ─── Analytics Computation ────────────────────────────────────────────────────

/**
 * Compute full analytics for today vs yesterday.
 * Returns a structured analytics object safe to send to an AI API.
 */
export async function computeDashboardAnalytics() {
  const { vehicles, revenueLogs, totalSlots, slotsByType } = await fetchAllData();

  const now = new Date();
  const todayStart = dayStart(now);
  const todayEnd = todayStart + 24 * 60 * 60 * 1000;
  const yesterdayStart = todayStart - 24 * 60 * 60 * 1000;
  const yesterdayEnd = todayStart;

  const isToday = (ts) => ts >= todayStart && ts < todayEnd;
  const isYesterday = (ts) => ts >= yesterdayStart && ts < yesterdayEnd;

  // ── Today's vehicles ────────────────────────────────────────────────────────

  const checkInsToday = vehicles.filter((v) => v.entryTime && isToday(v.entryTime));
  const checkOutsToday = vehicles.filter(
    (v) => v.exitTime && isToday(v.exitTime) && v.status === "checkedout" || 
           v.exitTime && isToday(v.exitTime) && v.status === "completed"
  );

  // Count currently parked (status = parked, regardless of when they checked in)
  const currentlyParked = vehicles.filter(
    (v) => v.status === "parked" || v.status === "Parked"
  );
  const currentOccupancy = currentlyParked.length;
  const occupancyPct = totalSlots > 0 ? Math.round((currentOccupancy / totalSlots) * 100) : 0;
  const remainingSlots = Math.max(0, totalSlots - currentOccupancy);

  // Vehicle type breakdown (currently parked)
  const occupiedByType = { standard: 0, ev: 0, taxi: 0 };
  currentlyParked.forEach((v) => {
    const t = v.type || "standard";
    if (t in occupiedByType) occupiedByType[t]++;
    else occupiedByType.standard++;
  });

  // Check-in type breakdown for today
  const checkInsByType = { standard: 0, ev: 0, taxi: 0 };
  checkInsToday.forEach((v) => {
    const t = v.type || "standard";
    if (t in checkInsByType) checkInsByType[t]++;
    else checkInsByType.standard++;
  });

  // Revenue today
  const revenueToday = revenueLogs
    .filter((r) => r.date && isToday(r.date))
    .reduce((s, r) => s + r.amount, 0);

  // Average parking duration today (completed vehicles with durationMins)
  const durations = checkOutsToday.filter((v) => v.durationMins && v.durationMins > 0).map((v) => v.durationMins);
  const avgDurationToday = durations.length > 0
    ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
    : null;

  // Peak hour today — most frequent entry hour
  const hourBuckets = Array(24).fill(0);
  checkInsToday.forEach((v) => {
    if (v.entryTime) {
      hourBuckets[new Date(v.entryTime).getHours()]++;
    }
  });
  const peakHourIdx = hourBuckets.indexOf(Math.max(...hourBuckets));
  const peakHour = checkInsToday.length > 0 ? fmtHour(peakHourIdx) : null;
  const peakHourCount = hourBuckets[peakHourIdx];

  // Most / least used type (by check-ins today)
  const typeEntries = Object.entries(checkInsByType).sort((a, b) => b[1] - a[1]);
  const mostUsedType = typeEntries[0]?.[0] || "standard";
  const leastUsedType = typeEntries[typeEntries.length - 1]?.[0] || "taxi";

  // Revenue per occupied slot
  const revenuePerSlot = currentOccupancy > 0
    ? Math.round(revenueToday / currentOccupancy)
    : 0;

  // ── Yesterday's vehicles ─────────────────────────────────────────────────────

  const checkInsYesterday = vehicles.filter((v) => v.entryTime && isYesterday(v.entryTime));
  const checkOutsYesterday = vehicles.filter(
    (v) => (v.exitTime && isYesterday(v.exitTime) && v.status === "completed") ||
            (v.exitTime && isYesterday(v.exitTime) && v.status === "checkedout")
  );

  const revenueYesterday = revenueLogs
    .filter((r) => r.date && isYesterday(r.date))
    .reduce((s, r) => s + r.amount, 0);

  const durationsYesterday = checkOutsYesterday
    .filter((v) => v.durationMins && v.durationMins > 0)
    .map((v) => v.durationMins);
  const avgDurationYesterday = durationsYesterday.length > 0
    ? Math.round(durationsYesterday.reduce((a, b) => a + b, 0) / durationsYesterday.length)
    : null;

  // Yesterday's parked vehicles at some point (approximate occupancy from check-ins - check-outs)
  const occupancyYesterdayEst = Math.max(0, checkInsYesterday.length - checkOutsYesterday.length);

  // ── Derived metrics ──────────────────────────────────────────────────────────

  const safeChangePct = (today, yesterday) => {
    if (!yesterday || yesterday === 0) return today > 0 ? 100 : 0;
    return Math.round(((today - yesterday) / yesterday) * 100);
  };

  const checkInChangePct = safeChangePct(checkInsToday.length, checkInsYesterday.length);
  const revenueChangePct = safeChangePct(revenueToday, revenueYesterday);
  const avgDurationDiffMins = (avgDurationToday !== null && avgDurationYesterday !== null)
    ? avgDurationToday - avgDurationYesterday
    : null;

  // ── Build analytics object ───────────────────────────────────────────────────

  return {
    generatedAt: now.toISOString(),
    currentTime: now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),

    today: {
      checkIns: checkInsToday.length,
      checkOuts: checkOutsToday.length,
      currentOccupancy,
      occupancyPct,
      remainingSlots,
      totalSlots,
      revenue: Math.round(revenueToday),
      avgParkingDurationMins: avgDurationToday,
      peakHour,
      peakHourCount,
      byType: checkInsByType,
      occupiedByType,
      mostUsedType,
      leastUsedType,
      revenuePerOccupiedSlot: revenuePerSlot,
    },

    yesterday: {
      checkIns: checkInsYesterday.length,
      checkOuts: checkOutsYesterday.length,
      revenue: Math.round(revenueYesterday),
      avgParkingDurationMins: avgDurationYesterday,
      estimatedOccupancy: occupancyYesterdayEst,
    },

    derived: {
      checkInChangePct,
      revenueChangePct,
      avgDurationDiffMins,
      trend: checkInChangePct >= 5 ? "up" : checkInChangePct <= -5 ? "down" : "stable",
    },

    slotConfig: {
      totalSlots,
      slotsByType,
    },
  };
}
