import { computeDashboardAnalytics } from "../backend/services/analyticsService.js";
import { generateInsight } from "../backend/services/insightAIService.js";

// ─── In-memory cache ──────────────────────────────────────────────────────────
// Keyed by YYYY-MM-DD.  Entry: { data, analyticsHash, expiresAt }
const cache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function dateKey(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function analyticsHash(analytics) {
  // Quick hash from key numbers to detect "significant change"
  const t = analytics.today;
  return `${t.checkIns}|${t.currentOccupancy}|${t.revenue}|${t.checkOuts}`;
}

// ─── Request body reader ──────────────────────────────────────────────────────

async function readBody(req) {
  if (req.body) {
    if (typeof req.body === "object") return req.body;
    try { return JSON.parse(req.body); } catch { return {}; }
  }
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  const raw = Buffer.concat(chunks).toString();
  try { return JSON.parse(raw || "{}"); } catch { return {}; }
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  // Add res helpers if missing (Vite dev middleware does not include them)
  if (!res.json) {
    res.status = (code) => { res.statusCode = code; return res; };
    res.json = (data) => {
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify(data));
      return res;
    };
  }

  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const body = await readBody(req);
    const forceRefresh = body?.forceRefresh === true || req.query?.forceRefresh === "true";
    const key = dateKey(new Date());

    // ── Cache check ────────────────────────────────────────────────────────────
    const cached = cache.get(key);
    if (cached && !forceRefresh && Date.now() < cached.expiresAt) {
      console.log("[DashboardInsight] Serving from cache.");
      return res.status(200).json({ ...cached.data, cached: true });
    }

    // ── Compute analytics ──────────────────────────────────────────────────────
    console.log("[DashboardInsight] Computing analytics...");
    let analytics;
    try {
      analytics = await computeDashboardAnalytics();
    } catch (err) {
      console.error("[DashboardInsight] Analytics computation failed:", err.message);
      // Return a safe fallback
      return res.status(200).json(buildErrorFallback(err.message));
    }

    // Skip regenerating if analytics haven't changed significantly
    const hash = analyticsHash(analytics);
    if (cached && cached.analyticsHash === hash && Date.now() < cached.expiresAt + CACHE_TTL_MS) {
      console.log("[DashboardInsight] Analytics unchanged. Extending cache.");
      cached.expiresAt = Date.now() + CACHE_TTL_MS;
      return res.status(200).json({ ...cached.data, cached: true });
    }

    // ── Generate AI insight ────────────────────────────────────────────────────
    console.log("[DashboardInsight] Generating AI insight...");
    let insight;
    try {
      insight = await generateInsight(analytics);
    } catch (err) {
      console.error("[DashboardInsight] Insight generation failed:", err.message);
      insight = {
        title: "Parking activity overview",
        summary: `Today's facility shows ${analytics.today.checkIns} check-ins with ${analytics.today.occupancyPct}% occupancy and ₹${analytics.today.revenue} in revenue.`,
        recommendation: "Monitor operations and review peak hour staffing.",
        priority: "medium",
        trend: analytics.derived.trend,
        confidence: 70,
        source: "error_fallback",
      };
    }

    const responseData = {
      ...insight,
      analytics: {
        today: analytics.today,
        yesterday: analytics.yesterday,
        derived: analytics.derived,
      },
      generatedAt: analytics.generatedAt,
      cached: false,
    };

    // ── Store in cache ─────────────────────────────────────────────────────────
    cache.set(key, {
      data: responseData,
      analyticsHash: hash,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });

    return res.status(200).json(responseData);
  } catch (err) {
    console.error("[DashboardInsight] Unexpected error:", err);
    return res.status(500).json(buildErrorFallback(err.message));
  }
}

function buildErrorFallback(message) {
  return {
    title: "Parking overview unavailable",
    summary: "Unable to generate AI summary at this time. Please check your Supabase connection and refresh the page.",
    recommendation: "Verify database connectivity and try refreshing.",
    priority: "medium",
    trend: "stable",
    confidence: 0,
    source: "error_fallback",
    error: message,
    analytics: null,
    generatedAt: new Date().toISOString(),
    cached: false,
  };
}
