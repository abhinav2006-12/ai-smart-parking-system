import { supabase } from "../config/supabase.js";

/**
 * Service to execute real-time queries against Supabase
 */
export const supabaseService = {
  /**
   * Fetch current slot configuration and calculate real-time available slots by type
   */
  async getSlotAvailability() {
    if (!supabase) throw new Error("Supabase client not initialized.");

    // Fetch settings
    const { data: settings, error: settingsError } = await supabase
      .from("settings")
      .select("total_slots, slots_by_type")
      .eq("id", 1)
      .single();

    if (settingsError) throw settingsError;

    // Fetch parked vehicles
    const { data: parkedVehicles, error: vehiclesError } = await supabase
      .from("vehicles")
      .select("type")
      .eq("status", "parked");

    if (vehiclesError) throw vehiclesError;

    const totalSlots = settings.total_slots || 0;
    const slotsByType = settings.slots_by_type || { standard: 0, ev: 0, disabled: 0 };

    // Group parked vehicles by type
    const parkedCounts = { standard: 0, ev: 0, disabled: 0 };
    parkedVehicles.forEach((v) => {
      const type = (v.type || "standard").toLowerCase();
      if (type in parkedCounts) {
        parkedCounts[type]++;
      } else {
        parkedCounts.standard++;
      }
    });

    // Calculate available slots
    const available = {};
    Object.keys(slotsByType).forEach((type) => {
      available[type] = Math.max(0, slotsByType[type] - (parkedCounts[type] || 0));
    });

    const totalParked = parkedVehicles.length;
    const totalAvailable = Math.max(0, totalSlots - totalParked);

    return {
      totalSlots,
      slotsByType,
      parkedCounts,
      availableSlotsByType: available,
      totalParked,
      totalAvailable,
    };
  },

  /**
   * Fetch today's vehicle bookings/entries
   */
  async getTodaysBookings() {
    if (!supabase) throw new Error("Supabase client not initialized.");

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayStartMs = todayStart.getTime();

    const { data: bookings, error } = await supabase
      .from("vehicles")
      .select("*")
      .gte("entry_time", todayStartMs)
      .order("entry_time", { ascending: false });

    if (error) throw error;

    return bookings || [];
  },

  /**
   * Calculate revenue generated during the last 7 days
   */
  async getWeeklyRevenue() {
    if (!supabase) throw new Error("Supabase client not initialized.");

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    oneWeekAgo.setHours(0, 0, 0, 0);
    const oneWeekAgoMs = oneWeekAgo.getTime();

    const { data: logs, error } = await supabase
      .from("revenue_log")
      .select("amount, date")
      .gte("date", oneWeekAgoMs);

    if (error) throw error;

    const totalRevenue = (logs || []).reduce((sum, r) => sum + Number(r.amount), 0);

    // Group revenue by day for mini breakdown
    const dailyBreakdown = {};
    (logs || []).forEach((r) => {
      const dayStr = new Date(Number(r.date)).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
      dailyBreakdown[dayStr] = (dailyBreakdown[dayStr] || 0) + Number(r.amount);
    });

    return {
      totalRevenue,
      logCount: logs?.length || 0,
      dailyBreakdown,
    };
  },

  /**
   * List all admin accounts active within the last 5 minutes (last_active_at)
   */
  async getActiveAdmins() {
    if (!supabase) throw new Error("Supabase client not initialized.");

    // Active in last 5 minutes
    const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

    const { data: active, error } = await supabase
      .from("admin_accounts")
      .select("id, name, email, role, last_active_at")
      .gt("last_active_at", fiveMinsAgo)
      .eq("is_active", true)
      .order("name", { ascending: true });

    if (error) throw error;

    const { data: allAdmins, error: allErr } = await supabase
      .from("admin_accounts")
      .select("id, name, email, role, is_active");

    if (allErr) throw allErr;

    return {
      activeAdmins: active || [],
      allAdminsCount: allAdmins?.length || 0,
      allAdmins: allAdmins || [],
    };
  },

  /**
   * Search for a vehicle by plate number (fuzzy match, case insensitive)
   */
  async findVehicle(plateNumber) {
    if (!supabase) throw new Error("Supabase client not initialized.");
    const cleanPlate = plateNumber.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");

    // Search by partial match of clean string or direct matches
    const { data: vehicles, error } = await supabase
      .from("vehicles")
      .select("*")
      .ilike("number", `%${cleanPlate}%`)
      .order("entry_time", { ascending: false })
      .limit(10);

    if (error) throw error;

    return vehicles || [];
  },

  /**
   * Fetch cancelled parking sessions/bookings
   */
  async getCancelledBookings() {
    if (!supabase) throw new Error("Supabase client not initialized.");

    const { data: cancelled, error } = await supabase
      .from("vehicles")
      .select("*")
      .eq("status", "cancelled")
      .order("entry_time", { ascending: false })
      .limit(15);

    if (error) throw error;

    return cancelled || [];
  },

  /**
   * Get occupancy specifically for EV slots
   */
  async getEvOccupancy() {
    const stats = await this.getSlotAvailability();
    return {
      totalEvSlots: stats.slotsByType.ev || 0,
      parkedEvCount: stats.parkedCounts.ev || 0,
      availableEvSlots: stats.availableSlotsByType.ev || 0,
    };
  },

  /**
   * Determine today's peak parking hours by entry frequency
   */
  async getPeakHours() {
    if (!supabase) throw new Error("Supabase client not initialized.");

    // Retrieve entry times of all vehicles checked in during the last 7 days to get reliable hourly trends
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);
    const sevenDaysAgoMs = sevenDaysAgo.getTime();

    const { data: entries, error } = await supabase
      .from("vehicles")
      .select("entry_time")
      .gte("entry_time", sevenDaysAgoMs);

    if (error) throw error;

    const hourCounts = Array(24).fill(0);
    (entries || []).forEach((e) => {
      if (e.entry_time) {
        const d = new Date(Number(e.entry_time));
        const hr = d.getHours();
        hourCounts[hr]++;
      }
    });

    // Find the hours with max check-ins
    const hoursWithCounts = hourCounts.map((count, hour) => ({ hour, count }));
    const sortedHours = [...hoursWithCounts].sort((a, b) => b.count - a.count);

    // Format hour names (e.g. 14 -> "02:00 PM")
    const formatHour = (h) => {
      const ampm = h >= 12 ? "PM" : "AM";
      const displayH = h % 12 === 0 ? 12 : h % 12;
      return `${displayH.toString().padStart(2, "0")}:00 ${ampm}`;
    };

    return {
      hourlyTrend: hoursWithCounts.map((item) => ({
        label: formatHour(item.hour),
        hour24: item.hour,
        entriesCount: item.count,
      })),
      peakHours: sortedHours.slice(0, 3).map((item) => ({
        time: formatHour(item.hour),
        hour24: item.hour,
        weight: item.count,
      })),
    };
  },

  /**
   * Fetch recent admin logs (up to 15 entries)
   */
  async getRecentLogs() {
    if (!supabase) throw new Error("Supabase client not initialized.");

    const { data: logs, error } = await supabase
      .from("admin_activity_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(15);

    if (error) throw error;
    return logs || [];
  },

  /**
   * Fetch total revenue earned today (since midnight local time).
   */
  async getTodaysRevenue() {
    if (!supabase) throw new Error("Supabase client not initialized.");

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayStartMs = todayStart.getTime();

    const { data: logs, error } = await supabase
      .from("revenue_log")
      .select("amount")
      .gte("date", todayStartMs);

    if (error) throw error;

    return (logs || []).reduce((sum, r) => sum + Number(r.amount), 0);
  },

  /**
   * Fetch recent activity logs involving failed/flagged ANPR or manual input.
   */
  async getRecentFailedOrFlaggedANPR() {
    if (!supabase) throw new Error("Supabase client not initialized.");

    const { data: logs, error } = await supabase
      .from("admin_activity_log")
      .select("*")
      .or("action.ilike.%failed%,action.ilike.%anpr%,action.ilike.%manual%,action.ilike.%unusual%")
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) throw error;
    return logs || [];
  }
};
