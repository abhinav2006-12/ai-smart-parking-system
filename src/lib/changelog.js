// ─── Changelog data ───────────────────────────────────────────────────────────
// Add new entries at the TOP of this array. Each entry supports:
//   version  : string  — e.g. "v2.4"
//   date     : string  — e.g. "7 Jul 2025"
//   tag      : "new" | "improved" | "fix" | "security"  (controls badge colour)
//   title    : string  — short headline
//   items    : string[] — bullet points (keep ≤ 6 per release)

export const CHANGELOG = [
  {
    version: "v2.4",
    date: "7 Jul 2025",
    tag: "new",
    title: "AI Operations Overview",
    items: [
      "Added AI Operations Overview card at the top of the Admin Dashboard.",
      "Generates an executive parking summary every time the dashboard opens — powered by Gemini 2.5 Flash.",
      "Three-tier fallback: Gemini → OpenAI → rich local analytics engine (12 scenarios, always works).",
      "Shows headline, priority badge, trend %, revenue, occupancy, peak hour, and AI confidence.",
      "5-minute server-side cache with smart invalidation when analytics change significantly.",
      "Refresh Insight button and View Analytics scroll-anchor included.",
    ],
  },
  {
    version: "v2.3",
    date: "Jun 2025",
    tag: "new",
    title: "AI Chatbot Assistant",
    items: [
      "Integrated Gemini-powered chatbot in the admin panel for natural language queries.",
      "Ask questions like 'How many vehicles are parked?' or 'What is today's revenue?'",
      "Falls back to OpenAI and then local keyword matching when AI APIs are unavailable.",
      "Chat history persists within the session.",
    ],
  },
  {
    version: "v2.2",
    date: "May 2025",
    tag: "improved",
    title: "Revenue & Analytics Charts",
    items: [
      "Added 7-day revenue area chart to the Dashboard tab.",
      "Added slot-type occupancy pie chart (Standard / EV / Taxi).",
      "Fixed ₹150/day operating cost line overlay on the revenue chart.",
      "Dashboard now shows today vs yesterday comparison for check-ins and revenue.",
    ],
  },
  {
    version: "v2.1",
    date: "Apr 2025",
    tag: "improved",
    title: "Multi-Admin Role System",
    items: [
      "Added role-based access: Head Admin and Standard Admin.",
      "UPI Payment Details and Danger Zone are now restricted to Head Admin role only.",
      "Admin user name is shown in the panel header and activity logs.",
      "Improved cross-device session locking with 30-minute auto-expiry.",
    ],
  },
  {
    version: "v2.0",
    date: "Mar 2025",
    tag: "new",
    title: "Supabase Cloud Sync",
    items: [
      "Migrated from localStorage-only storage to Supabase (PostgreSQL) as the primary data store.",
      "Real-time sync across multiple devices and browser tabs.",
      "localStorage retained as a fallback when Supabase is unreachable.",
      "Diff-based sync: only changed vehicle records are upserted.",
    ],
  },
  {
    version: "v1.5",
    date: "Feb 2025",
    tag: "new",
    title: "ANPR — Automatic Number Plate Recognition",
    items: [
      "Integrated Plate Recognizer Snapshot Cloud API for automatic Indian plate detection.",
      "Live camera captures at ~1 fps with auto-crop for best accuracy.",
      "Manual photo upload supported as an alternative to live camera.",
      "All ANPR API calls proxied through /api/anpr.js to keep token server-side.",
      "Detected plate is always shown in an editable field before confirming check-in.",
    ],
  },
  {
    version: "v1.2",
    date: "Jan 2025",
    tag: "improved",
    title: "UPI QR Checkout & Fare Engine",
    items: [
      "Added UPI QR code generation at checkout using the qrcode library.",
      "Configurable UPI VPA and payee name from Settings tab.",
      "Fare engine: per-hour rates with configurable minimum billable hours per vehicle type.",
      "Supports Standard, EV, and Taxi vehicle types with independent rate settings.",
    ],
  },
  {
    version: "v1.0",
    date: "Dec 2024",
    tag: "new",
    title: "Initial Release",
    items: [
      "Core check-in / check-out flow for parking attendants.",
      "Guest-facing kiosk interface for self check-in.",
      "Admin dashboard with real-time occupancy stats.",
      "Dark / light mode with OS preference detection.",
      "Settings tab for slot counts, rates, and UPI configuration.",
    ],
  },
];
