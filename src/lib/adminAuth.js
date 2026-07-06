import { supabase } from "./supabase";

// ---------------------------------------------------------------------------
// Password hashing — Web Crypto API (SHA-256 + random salt)
// Passwords are NEVER stored in plaintext.
// ---------------------------------------------------------------------------

/** Generate a hex random salt */
function genSalt() {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return Array.from(arr).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Hash password+salt using SHA-256, return hex string */
async function sha256(text) {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(text)
  );
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function hashPassword(password) {
  const salt = genSalt();
  const hash = await sha256(salt + password);
  return { hash, salt };
}

export async function verifyPassword(password, storedHash, storedSalt) {
  const hash = await sha256(storedSalt + password);
  return hash === storedHash;
}

// ---------------------------------------------------------------------------
// Head admin seed — creates the ABHINAV P R account on first run
// ---------------------------------------------------------------------------
const HEAD_EMAIL = "abhiinavpr@gmail.com";
const HEAD_NAME  = "ABHINAV P R";
const HEAD_PASS  = "abhiinav@park"; // hashed on first login; never stored plain

export async function seedHeadAdmin() {
  if (!supabase) return;
  const { data } = await supabase
    .from("admin_accounts")
    .select("id")
    .eq("email", HEAD_EMAIL)
    .maybeSingle();

  if (data) return; // already exists

  const { hash, salt } = await hashPassword(HEAD_PASS);
  await supabase.from("admin_accounts").insert({
    name: HEAD_NAME,
    email: HEAD_EMAIL,
    phone: "",
    role: "head",
    password_hash: hash,
    password_salt: salt,
    created_by: "system",
    is_active: true,
  });
}

// ---------------------------------------------------------------------------
// Login
// ---------------------------------------------------------------------------

/**
 * Attempts login. Returns account object on success, throws on failure.
 * @returns {{ id, name, email, phone, role }}
 */
export async function loginAdminAccount(email, password) {
  if (!supabase) throw new Error("Supabase is not configured. Please check your credentials in the environment configuration.");
  // Ensure head admin exists
  await seedHeadAdmin();

  const { data, error } = await supabase
    .from("admin_accounts")
    .select("*")
    .eq("email", email.toLowerCase().trim())
    .eq("is_active", true)
    .maybeSingle();

  if (error) throw new Error("Database error. Please try again.");
  if (!data)  throw new Error("No active account found for this email.");

  const valid = await verifyPassword(password, data.password_hash, data.password_salt);
  if (!valid) throw new Error("Incorrect password.");

  return {
    id:    data.id,
    name:  data.name,
    email: data.email,
    phone: data.phone,
    role:  data.role,
  };
}

// ---------------------------------------------------------------------------
// Account management (head admin only)
// ---------------------------------------------------------------------------

/** List all non-head admin accounts */
export async function listAdminAccounts() {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("admin_accounts")
    .select("id, name, email, phone, role, is_active, created_at, created_by")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

/** Create a new Gate Manager or Security account */
export async function createAdminAccount({ name, email, phone, role, password, createdBy }) {
  if (!supabase) throw new Error("Supabase is not configured.");
  const allowed = ["gate_manager", "security"];
  if (!allowed.includes(role)) throw new Error("Invalid role.");

  // Check duplicate
  const { data: existing } = await supabase
    .from("admin_accounts")
    .select("id")
    .eq("email", email.toLowerCase().trim())
    .maybeSingle();

  if (existing) throw new Error("An account with this email already exists.");

  const { hash, salt } = await hashPassword(password);
  const { error } = await supabase.from("admin_accounts").insert({
    name: name.trim(),
    email: email.toLowerCase().trim(),
    phone: phone?.trim() || "",
    role,
    password_hash: hash,
    password_salt: salt,
    created_by: createdBy,
    is_active: true,
  });

  if (error) throw error;
}

/** Toggle is_active for a sub-admin account */
export async function setAdminAccountActive(id, isActive) {
  if (!supabase) throw new Error("Supabase is not configured.");
  const { error } = await supabase
    .from("admin_accounts")
    .update({ is_active: isActive })
    .eq("id", id);
  if (error) throw error;
}

/** Hard delete a sub-admin account (head only) */
export async function deleteAdminAccount(id) {
  if (!supabase) throw new Error("Supabase is not configured.");
  const { error } = await supabase
    .from("admin_accounts")
    .delete()
    .eq("id", id)
    .neq("role", "head"); // safety: never delete head
  if (error) throw error;
}

/** Update password for an existing account */
export async function resetAdminPassword(id, newPassword) {
  if (!supabase) throw new Error("Supabase is not configured.");
  const { hash, salt } = await hashPassword(newPassword);
  const { error } = await supabase
    .from("admin_accounts")
    .update({ password_hash: hash, password_salt: salt })
    .eq("id", id);
  if (error) throw error;
}
