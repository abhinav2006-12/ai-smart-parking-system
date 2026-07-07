import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from current working directory
dotenv.config();

// Also load .env from the workspace root relative to this file
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

export const env = {
  PORT: process.env.PORT || 5000,
  JWT_SECRET: process.env.JWT_SECRET || "parkpilot_jwt_secret_key_default_12345",
  SUPABASE_URL: process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  SUPABASE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_KEY,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
};

// Simple validations
if (!env.SUPABASE_URL || !env.SUPABASE_KEY) {
  console.warn("[Backend Env] WARNING: Supabase URL or Key is missing!");
}
if (!env.OPENAI_API_KEY && !env.GEMINI_API_KEY) {
  console.warn("[Backend Env] WARNING: Neither OPENAI_API_KEY nor GEMINI_API_KEY is configured. AI responses will run in local fallback mode.");
}
