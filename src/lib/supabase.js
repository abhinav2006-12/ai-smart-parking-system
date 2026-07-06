import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Supabase credentials missing! Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.");
}

export const supabase = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export const normalizeStatusFromDb = (status) => {
  if (!status) return "parked";
  const s = status.toLowerCase();
  if (s === "checked out" || s === "completed") return "completed";
  if (s === "parked") return "parked";
  if (s === "cancelled") return "cancelled";
  if (s === "pending") return "pending";
  return s;
};

export const normalizeStatusToDb = (status) => {
  if (!status) return "Parked";
  const s = status.toLowerCase();
  if (s === "completed" || s === "checked out") return "Checked Out";
  if (s === "parked") return "Parked";
  if (s === "cancelled") return "Cancelled";
  if (s === "pending") return "Pending";
  return status;
};


/**
 * Loads settings, vehicles, and revenueLog tables from Supabase, mapping them to the camelCase local store structure.
 */
export async function loadStoreFromSupabase() {
  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  // 1. Fetch settings row (id = 1)
  const { data: settingsData, error: settingsError } = await supabase
    .from("settings")
    .select("*")
    .eq("id", 1)
    .single();

  if (settingsError && settingsError.code !== "PGRST116") { // PGRST116: no rows returned
    throw settingsError;
  }

  // 2. Fetch vehicles ordered by entry time descending
  const { data: vehiclesData, error: vehiclesError } = await supabase
    .from("vehicles")
    .select("*")
    .order("entry_time", { ascending: false });

  if (vehiclesError) {
    throw vehiclesError;
  }

  // 3. Fetch revenue log
  const { data: revenueData, error: revenueError } = await supabase
    .from("revenue_log")
    .select("*");

  if (revenueError) {
    throw revenueError;
  }

  // Casing mappings (db snake_case -> react camelCase)
  const settings = settingsData
    ? {
        totalSlots: settingsData.total_slots,
        slotsByType: settingsData.slots_by_type,
        rates: settingsData.rates,
        upiVpa: settingsData.upi_vpa,
        upiPayeeName: settingsData.upi_payee_name,
        currency: settingsData.currency,
      }
    : null;

  const parseTime = (val) => {
    if (!val) return null;
    const num = Number(val);
    if (isNaN(num)) {
      return new Date(val).getTime();
    }
    if (num > 0 && num < 10000000000) {
      return num * 1000;
    }
    return num;
  };


  const vehicles = (vehiclesData || []).map((v) => ({
    id: v.id,
    number: v.number,
    type: v.type,
    entryTime: parseTime(v.entry_time),
    exitTime: parseTime(v.exit_time),
    status: normalizeStatusFromDb(v.status),
    fee: v.fee ? Number(v.fee) : null,
    durationMins: v.duration_mins,
    entryPhoto: v.entry_photo,
    exitPhoto: v.exit_photo,
  }));

  const revenueLog = (revenueData || []).map((r) => ({
    id: r.id,
    vehicleId: r.vehicle_id,
    amount: Number(r.amount),
    date: parseTime(r.date),
  }));

  if (!settings) {
    return null; // Return null so the hook can initialize defaults in the database
  }

  return {
    settings,
    vehicles,
    revenueLog,
  };
}

/**
 * Saves/syncs the local state differences back to Supabase.
 * Compares newStore with oldStore to perform minimal upserts, inserts, and deletions.
 */
export async function syncStoreToSupabase(newStore, oldStore) {
  if (!supabaseUrl || !supabaseAnonKey) {
    return;
  }

  // 1. Sync Settings (if changed)
  if (JSON.stringify(newStore.settings) !== JSON.stringify(oldStore.settings)) {
    const { error } = await supabase
      .from("settings")
      .update({
        total_slots: newStore.settings.totalSlots,
        slots_by_type: newStore.settings.slotsByType,
        rates: newStore.settings.rates,
        upi_vpa: newStore.settings.upiVpa,
        upi_payee_name: newStore.settings.upiPayeeName,
        currency: newStore.settings.currency,
      })
      .eq("id", 1);
    if (error) throw error;
  }

  const formatTime = (val) => {
    if (!val) return null;
    return new Date(val).toISOString();
  };

  // 2. Sync Vehicles
  const oldVehiclesMap = new Map(oldStore.vehicles.map((v) => [v.id, v]));
  const vehiclesToUpsert = [];

  for (const v of newStore.vehicles) {
    const oldV = oldVehiclesMap.get(v.id);
    if (!oldV || JSON.stringify(v) !== JSON.stringify(oldV)) {
      vehiclesToUpsert.push({
        id: v.id,
        number: v.number,
        type: v.type,
        entry_time: formatTime(v.entryTime),
        exit_time: formatTime(v.exitTime),
        status: normalizeStatusToDb(v.status),
        fee: v.fee,
        duration_mins: v.durationMins,
        entry_photo: v.entryPhoto,
        exit_photo: v.exitPhoto,
      });
    }
  }

  if (vehiclesToUpsert.length > 0) {
    const { error } = await supabase.from("vehicles").upsert(vehiclesToUpsert);
    if (error) throw error;
  }

  // Sync deletions for Vehicles (if any)
  const newVehiclesSet = new Set(newStore.vehicles.map((v) => v.id));
  const vehiclesToDelete = oldStore.vehicles.filter((v) => !newVehiclesSet.has(v.id)).map((v) => v.id);
  if (vehiclesToDelete.length > 0) {
    const { error } = await supabase.from("vehicles").delete().in("id", vehiclesToDelete);
    if (error) console.error("[syncStore] vehicles delete error:", error);
  }

  // 3. Sync Revenue Log
  const oldRevenueMap = new Map(oldStore.revenueLog.map((r) => [r.id, r]));
  const revenueToInsert = [];

  for (const r of newStore.revenueLog) {
    const oldR = oldRevenueMap.get(r.id);
    if (!oldR) {
      revenueToInsert.push({
        id: r.id,
        vehicle_id: r.vehicleId,
        amount: r.amount,
        date: formatTime(r.date),
      });
    }
  }

  if (revenueToInsert.length > 0) {
    const { error } = await supabase.from("revenue_log").insert(revenueToInsert);
    if (error) throw error;
  }

  // Sync deletions for Revenue Log (if any)
  const newRevenueSet = new Set(newStore.revenueLog.map((r) => r.id));
  const revenueToDelete = oldStore.revenueLog.filter((r) => !newRevenueSet.has(r.id)).map((r) => r.id);
  if (revenueToDelete.length > 0) {
    const { error } = await supabase.from("revenue_log").delete().in("id", revenueToDelete);
    if (error) console.error("[syncStore] revenue delete error:", error);
  }
}

/**
 * Wipes ALL vehicles and revenue_log rows from Supabase.
 * Uses a broad column filter that matches every real row, bypassing RLS id-list restrictions.
 */
export async function wipeAllData() {
  if (!supabaseUrl || !supabaseAnonKey) return;

  // Delete revenue_log first (foreign-key safe order)
  const { error: revErr } = await supabase
    .from("revenue_log")
    .delete()
    .gte("amount", 0); // matches every row (amount is always >= 0)

  if (revErr) {
    console.error("[wipeAllData] revenue_log error:", revErr);
    throw revErr;
  }

  // Delete all vehicles
  const { error: vehErr } = await supabase
    .from("vehicles")
    .delete()
    .in("status", ["parked", "completed", "cancelled", "pending", "Parked", "Checked Out", "Cancelled", "Pending"]); // covers every possible status

  if (vehErr) {
    console.error("[wipeAllData] vehicles error:", vehErr);
    throw vehErr;
  }
}

// ─── Admin Session Management (cross-device single-session lock) ───────────

const SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Generates a random session token string.
 */
function genToken() {
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
}

/**
 * Tries to claim the admin session in Supabase.
 * Returns { ok: true, token } if the seat was free (or expired),
 * Returns { ok: false, since } if another active session is running.
 */
export async function claimAdminSession(existingToken) {
  if (!supabase) {
    return { ok: true, token: null };
  }
  // Read current session state
  const { data, error } = await supabase
    .from("settings")
    .select("session_token, session_at")
    .eq("id", 1)
    .single();

  if (error) {
    console.error("[session] read error:", error);
    // Allow login if we can't read — fail open
    return { ok: true, token: null };
  }

  const now = Date.now();
  const isActive =
    data.session_token &&
    data.session_at &&
    now - Number(data.session_at) < SESSION_TTL_MS;

  // If the active session belongs to the token we already have, it's valid
  if (isActive && existingToken && data.session_token === existingToken) {
    return { ok: true, token: existingToken };
  }

  if (isActive) {
    return { ok: false, since: Number(data.session_at) };
  }

  // Seat is free — write our token
  const token = existingToken || genToken();
  const { error: writeErr } = await supabase
    .from("settings")
    .update({ session_token: token, session_at: now })
    .eq("id", 1);

  if (writeErr) {
    console.error("[session] claim error:", writeErr);
    return { ok: true, token: null }; // fail open
  }

  return { ok: true, token };
}

/**
 * Refreshes session heartbeat so it doesn't expire while the admin is active.
 * Should be called every ~5 minutes. Pass the token from claimAdminSession.
 */
export async function refreshAdminSession(token) {
  if (!token || !supabase) return;
  await supabase
    .from("settings")
    .update({ session_at: Date.now() })
    .eq("id", 1)
    .eq("session_token", token); // only refresh if WE own the token
}

/**
 * Clears the admin session token so other devices can log in.
 */
export async function releaseAdminSession(token) {
  if (!token || !supabase) return;
  await supabase
    .from("settings")
    .update({ session_token: null, session_at: null })
    .eq("id", 1)
    .eq("session_token", token); // only clear if WE own the token
}

/**
 * Checks if the admin session is currently occupied by any active device.
 */
export async function isSessionOccupied() {
  if (!supabase) return false;
  const { data, error } = await supabase
    .from("settings")
    .select("session_token, session_at")
    .eq("id", 1)
    .single();

  if (error || !data) return false;
  const now = Date.now();
  return !!(
    data.session_token &&
    data.session_at &&
    now - Number(data.session_at) < SESSION_TTL_MS
  );
}

/**
 * Forcefully clears the admin session, ignoring who owns it.
 */
export async function forceResetAdminSession() {
  if (!supabase) return;
  await supabase
    .from("settings")
    .update({ session_token: null, session_at: null })
    .eq("id", 1);
}
