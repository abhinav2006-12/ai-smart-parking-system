import { supabase } from "./supabase";

/**
 * Log an admin action to the admin_activity_log table.
 * Silently fails so it never breaks core flows.
 *
 * @param {{ id, name, email, role }} adminUser
 * @param {string} action  e.g. "Logged in", "Updated rates", "Checked in KL07AB1234"
 * @param {object} [detail] optional JSON payload
 */
export async function logActivity(adminUser, action, detail = null) {
  if (!adminUser?.email) return;
  try {
    await supabase.from("admin_activity_log").insert({
      admin_id:    adminUser.id   || null,
      admin_email: adminUser.email,
      admin_name:  adminUser.name,
      admin_role:  adminUser.role,
      action,
      detail: detail ? detail : null,
    });
  } catch (err) {
    console.warn("[activityLog] Failed to write log:", err);
  }
}

/**
 * Fetch recent activity log entries (head admin only).
 * @param {number} limit
 */
export async function fetchActivityLog(limit = 200) {
  const { data, error } = await supabase
    .from("admin_activity_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}
