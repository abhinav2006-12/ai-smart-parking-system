import { createClient } from "@supabase/supabase-js";
import { env } from "./env.js";

if (!env.SUPABASE_URL || !env.SUPABASE_KEY) {
  console.error("[Backend Supabase] Missing credentials! Cannot initialize client.");
}

export const supabase = (env.SUPABASE_URL && env.SUPABASE_KEY)
  ? createClient(env.SUPABASE_URL, env.SUPABASE_KEY, {
      auth: {
        persistSession: false, // Don't persist backend session in storage
      }
    })
  : null;
