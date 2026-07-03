/**
 * Computes mean and standard deviation for a set of values.
 */
function getMeanAndStdDev(values) {
  if (values.length === 0) return { mean: 0, stddev: 0 };
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  if (values.length <= 1) return { mean, stddev: 0 };
  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / (values.length - 1);
  return { mean, stddev: Math.sqrt(variance) };
}

/**
 * Computes statistical outlier detection for a list of vehicles.
 * 
 * @param {Array} vehicles 
 */
export function computeVehicleStats(vehicles) {
  // Filter for valid numbers
  const durations = vehicles.filter(v => v.durationMins != null && v.status === "completed").map(v => v.durationMins);
  const fees = vehicles.filter(v => v.fee != null && v.status === "completed").map(v => v.fee);
  
  // Hours of entry
  const entryHours = vehicles.map(v => new Date(v.entryTime).getHours());
  
  // Calculate standard metrics
  const durationStats = getMeanAndStdDev(durations);
  const feeStats = getMeanAndStdDev(fees);
  
  // Calculate hour of day frequency
  const hourCounts = Array(24).fill(0);
  entryHours.forEach(h => {
    hourCounts[h]++;
  });

  // Vehicle type counts
  const typeCounts = {};
  vehicles.forEach(v => {
    typeCounts[v.type] = (typeCounts[v.type] || 0) + 1;
  });

  const totalVehiclesCount = vehicles.length || 1;

  const unusualVehicleIds = new Set();
  const vehicleOutlierReasons = {};

  vehicles.forEach(v => {
    const reasons = [];

    // 1. Duration outlier (>2 stddev)
    if (v.status === "completed" && v.durationMins != null && durationStats.stddev > 0) {
      const diff = Math.abs(v.durationMins - durationStats.mean);
      if (diff > 2 * durationStats.stddev) {
        reasons.push("duration");
      }
    }

    // 2. Fee outlier (>2 stddev)
    if (v.status === "completed" && v.fee != null && feeStats.stddev > 0) {
      const diff = Math.abs(v.fee - feeStats.mean);
      if (diff > 2 * feeStats.stddev) {
        reasons.push("fee");
      }
    }

    // 3. Entry hour outlier (rare hour: count <= 2 and represents <= 5% of total entries)
    const hour = new Date(v.entryTime).getHours();
    const countAtHour = hourCounts[hour] || 0;
    if (countAtHour <= 2 && (countAtHour / totalVehiclesCount) <= 0.05) {
      reasons.push("entryHour");
    }

    // 4. Rare vehicle type (type count <= 2 and represents <= 5% of total entries)
    const countOfType = typeCounts[v.type] || 0;
    if (countOfType <= 2 && (countOfType / totalVehiclesCount) <= 0.05) {
      reasons.push("rareType");
    }

    if (reasons.length > 0) {
      unusualVehicleIds.add(v.id);
      vehicleOutlierReasons[v.id] = reasons;
    }
  });

  return {
    duration: durationStats,
    fee: feeStats,
    unusualVehicleIds,
    vehicleOutlierReasons,
  };
}
