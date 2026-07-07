/**
 * Helper to calculate duration short display string (e.g. "5d 8h" or "12h 30m").
 */
export function formatDurationShort(durationMs) {
  const mins = Math.max(1, Math.ceil(durationMs / 60000));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  
  if (h < 24) {
    if (h === 0) return `${m} min`;
    return `${h}h ${m}m`;
  }
  const d = Math.floor(h / 24);
  const remH = h % 24;
  return `${d}d ${remH}h`;
}

/**
 * Determine stay category badge details based on duration in milliseconds.
 * - Normal (0–24 hours) (🟢)
 * - Extended Stay (1–3 days) (🟡)
 * - Long Stay (3–5 days) (🟠)
 * - Attention Required (5+ days) (🔴)
 */
export function getStayCategory(durationMs) {
  const hours = durationMs / (1000 * 60 * 60);
  
  if (hours <= 24) {
    return {
      type: "normal",
      label: "Normal",
      dot: "🟢",
      style: {
        background: "var(--success-soft)",
        color: "var(--success)",
      }
    };
  } else if (hours <= 72) {
    return {
      type: "extended",
      label: "Extended Stay",
      dot: "🟡",
      style: {
        background: "var(--warning-soft)",
        color: "var(--warning)",
      }
    };
  } else if (hours <= 120) {
    return {
      type: "long",
      label: "Long Stay",
      dot: "🟠",
      style: {
        background: "rgba(161, 98, 7, 0.12)",
        color: "#D97706",
      }
    };
  } else {
    return {
      type: "attention",
      label: "Attention Required",
      dot: "🔴",
      style: {
        background: "var(--danger-soft)",
        color: "var(--danger)",
      }
    };
  }
}

/**
 * Determine priority level.
 * - Normal (< 3 days)
 * - Medium (3 - 5 days)
 * - High (5 - 10 days)
 * - Critical (> 10 days)
 */
export function getPriorityLevel(durationMs) {
  const days = durationMs / (1000 * 60 * 60 * 24);
  if (days <= 3) return "Normal";
  if (days <= 5) return "Medium";
  if (days <= 10) return "High";
  return "Critical";
}

/**
 * Calculate accrued fee using the store rates config.
 */
export function calculateAccruedFee(vehicle, settings, now) {
  const entryTime = vehicle.entryTime;
  if (!entryTime) return 0;
  const durationMs = now - entryTime;
  const mins = Math.max(1, Math.ceil(durationMs / 60000));
  const rate = settings?.rates?.[vehicle.type] || settings?.rates?.standard || { hourly: 20, minHours: 1 };
  const hours = Math.max(Number(rate.minHours) || 1, Math.ceil(mins / 60));
  return hours * (Number(rate.hourly) || 20);
}

/**
 * Generate a dynamic natural-language AI insight under 60 words.
 */
export function generateAIInsight(vehicle, formattedDuration, fee, priority) {
  const { number, type } = vehicle;
  const typeLabel = type === "ev" ? "EV charging slot" : type === "taxi" ? "taxi zone" : "standard slot";
  const feeStr = `₹${Math.round(fee).toLocaleString("en-IN")}`;

  if (type === "ev") {
    return `Electric vehicle ${number} has occupied an EV charging slot for ${formattedDuration}, accumulating a fee of ${feeStr}. Extended occupancy blocks active charging access for other users. Attendants should verify charging completion and coordinate relocation to a standard parking space.`;
  }
  if (type === "taxi") {
    return `Taxi ${number} has been stationed in the ${typeLabel} for ${formattedDuration}, accumulating ${feeStr} in fees. Since commercial vehicles typically have high turnover, this extended stay is unusual. Attendants should contact the dispatch office or driver to confirm vehicle status.`;
  }
  return `This standard vehicle ${number} has remained parked for ${formattedDuration}, accumulating ${feeStr} in parking fees. This prolonged stay is significantly longer than average, elevating priority to ${priority}. Attendants should verify long-term permits or contact the registered owner.`;
}

/**
 * Tailor recommendations based on vehicle status, fee, priority, and stay duration.
 */
export function getRecommendations(vehicle, fee, priority, durationDays) {
  const recs = [];
  
  if (vehicle.type === "ev") {
    recs.push("Verify if EV charging is complete and free up the charger.");
    recs.push("Contact the owner to request moving the vehicle to a standard slot.");
  } else if (vehicle.type === "taxi") {
    recs.push("Contact the taxi operator or fleet dispatch to confirm driver status.");
    recs.push("Verify taxi company contact details on company databases.");
  } else {
    recs.push("Contact the vehicle owner to confirm the extended stay.");
  }

  if (durationDays > 10) {
    recs.push("Check safety and security cameras around the vehicle for activity.");
    recs.push("Review applicable long-term parking charges and prepare invoice.");
    recs.push("Escalate to facility manager for physical inspection / towing check.");
  } else if (durationDays > 5) {
    recs.push("Verify whether long-term parking permission or permit exists.");
    recs.push("Review applicable long-term parking charges.");
  } else {
    recs.push("Continue monitoring if extended parking is expected.");
  }

  // Ensure unique list and return
  return [...new Set(recs)];
}

/**
 * Compute smart analytics.
 */
export function calculateLongStayAnalytics(vehicles, now) {
  const parkedVehicles = vehicles.filter(v => v.status === "parked");
  const totalOccupied = parkedVehicles.length;

  const fiveDaysMs = 5 * 24 * 60 * 60 * 1000;
  const longStayVehicles = parkedVehicles.filter(v => {
    const durationMs = now - v.entryTime;
    return durationMs > fiveDaysMs;
  });

  const totalLongStay = longStayVehicles.length;

  // Longest parked vehicle stay duration
  let longestStayMs = 0;
  if (totalOccupied > 0) {
    const stays = parkedVehicles.map(v => now - v.entryTime);
    longestStayMs = Math.max(...stays, 0);
  }
  const longestStayDays = parseFloat((longestStayMs / (24 * 60 * 60 * 1000)).toFixed(1));

  // Average stay duration of long-stay vehicles
  let averageStayDays = 0;
  if (totalLongStay > 0) {
    const totalMs = longStayVehicles.reduce((sum, v) => sum + (now - v.entryTime), 0);
    const avgMs = totalMs / totalLongStay;
    averageStayDays = parseFloat((avgMs / (24 * 60 * 60 * 1000)).toFixed(1));
  }

  // Percentage of occupied slots taken by long-stay vehicles
  const occupiedPct = totalOccupied > 0 ? Math.round((totalLongStay / totalOccupied) * 100) : 0;

  return {
    totalLongStay,
    longestStayDays,
    averageStayDays,
    occupiedPct,
    totalOccupied
  };
}

/**
 * Generate dynamic AI summary overview text.
 */
export function generateAISummary(analytics) {
  const { totalLongStay, occupiedPct, longestStayDays } = analytics;
  const numberWords = ["No", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten"];
  const countStr = totalLongStay <= 10 ? numberWords[totalLongStay] : totalLongStay;
  
  if (totalLongStay === 0) {
    return "No vehicles have remained parked for more than five days. Parking slot availability is at healthy levels, and traffic flow remains efficient.";
  }

  return `${countStr} vehicle${totalLongStay !== 1 ? "s have" : " has"} remained parked for more than five days, occupying ${occupiedPct}% of current parking capacity. The longest parked vehicle has remained for ${longestStayDays} days. Reviewing these vehicles may improve parking availability.`;
}
