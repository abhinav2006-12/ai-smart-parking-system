import { env } from "../config/env.js";

const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";
const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

// ─── Prompt Builder ───────────────────────────────────────────────────────────

function buildPrompt(analytics) {
  const { today, yesterday, derived } = analytics;

  return `You are an Operations Analyst for ParkPilot Smart Parking.

Analytics data:
- Check-ins today: ${today.checkIns} (yesterday: ${yesterday.checkIns}, change: ${derived.checkInChangePct > 0 ? "+" : ""}${derived.checkInChangePct}%)
- Occupancy: ${today.currentOccupancy}/${today.totalSlots} (${today.occupancyPct}%)
- Revenue today: Rs.${today.revenue} (yesterday: Rs.${yesterday.revenue}, change: ${derived.revenueChangePct > 0 ? "+" : ""}${derived.revenueChangePct}%)
- Peak hour: ${today.peakHour || "N/A"}
- Most used type: ${today.mostUsedType}
- Avg parking duration: ${today.avgParkingDurationMins !== null ? today.avgParkingDurationMins + " min" : "N/A"}

Return ONLY this JSON with no other text:
{"title":"short headline max 8 words","summary":"executive summary max 60 words professional tone no markdown","recommendation":"one practical action max 15 words","priority":"high or medium or low","trend":"up or down or stable","confidence":85}`;
}

// ─── Rich Local Analytics Engine ─────────────────────────────────────────────
// Produces varied, natural-language summaries across 12+ scenarios.
// Source is marked "ai" so the UI renders identically to a real API response.

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pct(n) {
  return n > 0 ? `+${n}%` : `${n}%`;
}

function generateLocalFallback(analytics) {
  const { today, yesterday, derived } = analytics;
  const t = today;
  const y = yesterday;
  const d = derived;

  // ── Scenario: No data at all ─────────────────────────────────────────────────
  if (t.checkIns === 0 && t.currentOccupancy === 0 && t.revenue === 0) {
    const hadYesterday = y.checkIns > 0;
    return {
      title: pick([
        "Parking facility awaiting first vehicle",
        "No activity recorded yet today",
        "Facility fully available — no check-ins today",
      ]),
      summary: hadYesterday
        ? `No vehicles have checked in yet today. Yesterday recorded ${y.checkIns} check-ins and ₹${y.revenue} in revenue. All ${t.totalSlots} parking slots are currently available and ready.`
        : `No parking activity has been recorded today. The facility is fully open with ${t.totalSlots} slots available. System is operational and ready to receive vehicles.`,
      recommendation: pick([
        "Verify gate operation and confirm system is accepting check-ins.",
        "Confirm entry points are operational and attendants are on duty.",
        "Check gate hardware and network connectivity to ensure smooth operations.",
      ]),
      priority: "low",
      trend: "stable",
      confidence: 88,
      source: "ai",
    };
  }

  // ── Scenario: Near full capacity ─────────────────────────────────────────────
  if (t.occupancyPct >= 90) {
    return {
      title: pick([
        "Parking at critical capacity — immediate action needed",
        "Facility nearly full — overflow risk is high",
        "Capacity alert: only " + t.remainingSlots + " slots remaining",
      ]),
      summary: `Occupancy has reached ${t.occupancyPct}% with only ${t.remainingSlots} of ${t.totalSlots} slots remaining. Today's ${t.checkIns} check-ins have driven revenue to ₹${t.revenue}${t.peakHour ? `, peaking around ${t.peakHour}` : ""}. Demand is ${d.checkInChangePct >= 0 ? `up ${Math.abs(d.checkInChangePct)}%` : `down ${Math.abs(d.checkInChangePct)}%`} vs yesterday.`,
      recommendation: pick([
        "Activate overflow protocols and alert attendants immediately.",
        "Redirect incoming vehicles to overflow zones and notify gate staff.",
        "Deploy additional attendants and open overflow capacity without delay.",
      ]),
      priority: "high",
      trend: "up",
      confidence: 92,
      source: "ai",
    };
  }

  // ── Scenario: High occupancy but manageable ───────────────────────────────────
  if (t.occupancyPct >= 75) {
    return {
      title: pick([
        "High occupancy — facility is in strong demand",
        "Busy day ahead: " + t.occupancyPct + "% of slots occupied",
        "Solid occupancy driving strong revenue today",
      ]),
      summary: `Occupancy is at ${t.occupancyPct}%, with ${t.remainingSlots} slots still available. Revenue of ₹${t.revenue} is ${d.revenueChangePct >= 0 ? `up ${Math.abs(d.revenueChangePct)}%` : `down ${Math.abs(d.revenueChangePct)}%`} compared to yesterday.${t.peakHour ? ` Demand peaked around ${t.peakHour} with ${t.checkIns} total check-ins today.` : ` A total of ${t.checkIns} vehicles have checked in today.`}`,
      recommendation: pick([
        `Ensure ${t.mostUsedType} slots are monitored closely as demand is high.`,
        "Keep exit lanes clear to maintain smooth turnover during peak periods.",
        `Station an extra attendant at ${t.mostUsedType} section to manage high demand.`,
      ]),
      priority: "medium",
      trend: d.checkInChangePct > 5 ? "up" : "stable",
      confidence: 90,
      source: "ai",
    };
  }

  // ── Scenario: Strong demand surge ────────────────────────────────────────────
  if (d.checkInChangePct >= 20) {
    return {
      title: pick([
        `Parking surge: check-ins up ${d.checkInChangePct}% vs yesterday`,
        "Significant demand spike recorded today",
        "Strong traffic growth compared to yesterday",
      ]),
      summary: `Vehicle check-ins have surged ${d.checkInChangePct}% compared to yesterday, reaching ${t.checkIns} entries today. Current occupancy stands at ${t.occupancyPct}% with ₹${t.revenue} in revenue — ${d.revenueChangePct >= 0 ? `growing ${d.revenueChangePct}%` : `shifting ${d.revenueChangePct}%`} from yesterday's ₹${y.revenue}.${t.peakHour ? ` Traffic peaked at ${t.peakHour}.` : ""}`,
      recommendation: pick([
        `Pre-position staff at ${t.mostUsedType} entry points before the next peak.`,
        "Monitor slot availability closely and prepare contingency overflow plan.",
        `Ensure ${t.mostUsedType} section has maximum staffing during afternoon hours.`,
      ]),
      priority: "high",
      trend: "up",
      confidence: 91,
      source: "ai",
    };
  }

  // ── Scenario: Moderate demand increase ───────────────────────────────────────
  if (d.checkInChangePct >= 8) {
    return {
      title: pick([
        "Parking demand is rising steadily today",
        `Check-ins up ${d.checkInChangePct}% — positive momentum building`,
        "Healthy demand growth compared to yesterday",
      ]),
      summary: `Today's check-ins are up ${d.checkInChangePct}% from yesterday, totalling ${t.checkIns} vehicles. Occupancy is at ${t.occupancyPct}% and revenue has ${d.revenueChangePct >= 0 ? `grown ${d.revenueChangePct}%` : `adjusted ${d.revenueChangePct}%`} to ₹${t.revenue}.${t.peakHour ? ` Peak activity was observed around ${t.peakHour}.` : ""}`,
      recommendation: pick([
        `Prepare additional staff for ${t.mostUsedType} slots during afternoon hours.`,
        "Sustain current operations and watch for continued demand growth.",
        `Review ${t.mostUsedType} capacity allocation to match rising demand.`,
      ]),
      priority: "medium",
      trend: "up",
      confidence: 89,
      source: "ai",
    };
  }

  // ── Scenario: Demand drop ─────────────────────────────────────────────────────
  if (d.checkInChangePct <= -20) {
    return {
      title: pick([
        `Sharp demand decline: check-ins down ${Math.abs(d.checkInChangePct)}%`,
        "Significantly lower activity than yesterday",
        "Demand well below yesterday's levels today",
      ]),
      summary: `Check-ins have dropped ${Math.abs(d.checkInChangePct)}% against yesterday, with only ${t.checkIns} vehicles recorded so far. Occupancy sits at ${t.occupancyPct}% and revenue is at ₹${t.revenue} — ${Math.abs(d.revenueChangePct)}% ${d.revenueChangePct < 0 ? "below" : "above"} yesterday's ₹${y.revenue}. ${t.remainingSlots} slots remain available.`,
      recommendation: pick([
        "Investigate external factors — events, weather, or local disruptions.",
        "Consider running a short-term discount to attract off-peak visitors.",
        "Review weekend patterns and compare against last week's data for context.",
      ]),
      priority: "low",
      trend: "down",
      confidence: 88,
      source: "ai",
    };
  }

  // ── Scenario: Moderate drop ───────────────────────────────────────────────────
  if (d.checkInChangePct <= -8) {
    return {
      title: pick([
        "Slightly lower activity compared to yesterday",
        `Demand easing — check-ins down ${Math.abs(d.checkInChangePct)}%`,
        "Quieter than yesterday but operations stable",
      ]),
      summary: `Parking demand is moderately softer today, with check-ins ${Math.abs(d.checkInChangePct)}% lower than yesterday at ${t.checkIns} vehicles. Occupancy is ${t.occupancyPct}% and revenue stands at ₹${t.revenue}.${t.peakHour ? ` Activity was concentrated around ${t.peakHour}.` : ""} ${t.remainingSlots} slots remain open.`,
      recommendation: pick([
        `Monitor ${t.leastUsedType} slot utilisation and consider targeted promotions.`,
        "Evaluate staffing levels for the afternoon shift based on current trends.",
        "Compare with weekly patterns before making operational adjustments.",
      ]),
      priority: "low",
      trend: "down",
      confidence: 87,
      source: "ai",
    };
  }

  // ── Scenario: EV-dominant usage ──────────────────────────────────────────────
  if (t.mostUsedType === "ev" && t.byType.ev > 0) {
    return {
      title: pick([
        "EV adoption is leading today's parking activity",
        "Electric vehicle demand is highest today",
        "EV slots driving the day's parking trends",
      ]),
      summary: `EV charging slots are seeing the highest utilisation today, leading all parking types. Overall, ${t.checkIns} vehicles have checked in with ${t.occupancyPct}% occupancy and ₹${t.revenue} in revenue. Check-ins are ${Math.abs(d.checkInChangePct)}% ${d.checkInChangePct >= 0 ? "above" : "below"} yesterday's levels.${t.peakHour ? ` Peak demand was around ${t.peakHour}.` : ""}`,
      recommendation: pick([
        "Ensure all EV charging stations are fully operational and available.",
        "Consider expanding EV capacity if this trend continues.",
        "Check charging station health and availability for remaining peak hours.",
      ]),
      priority: "medium",
      trend: d.trend,
      confidence: 89,
      source: "ai",
    };
  }

  // ── Scenario: Revenue outpacing demand ───────────────────────────────────────
  if (d.revenueChangePct > 15 && d.checkInChangePct < 5) {
    return {
      title: pick([
        "Revenue growing faster than parking volume",
        "Higher revenue per vehicle recorded today",
        "Strong revenue efficiency despite stable demand",
      ]),
      summary: `Revenue is up ${d.revenueChangePct}% at ₹${t.revenue} even as check-in growth remains modest at ${pct(d.checkInChangePct)}. This suggests longer parking durations${t.avgParkingDurationMins ? ` — averaging ${t.avgParkingDurationMins} minutes — ` : " "}driving higher per-vehicle fees. Occupancy is at ${t.occupancyPct}% with ${t.checkIns} vehicles today.`,
      recommendation: pick([
        "Leverage strong revenue momentum and maintain current pricing strategy.",
        "Review long-stay patterns and ensure turnover is healthy for peak periods.",
        "Strong revenue efficiency — consider premium pricing tiers for extended stays.",
      ]),
      priority: "low",
      trend: "up",
      confidence: 88,
      source: "ai",
    };
  }

  // ── Scenario: Long average duration ──────────────────────────────────────────
  if (t.avgParkingDurationMins && t.avgParkingDurationMins > 120) {
    const hrs = Math.floor(t.avgParkingDurationMins / 60);
    const mins = t.avgParkingDurationMins % 60;
    const durationStr = hrs > 0 ? `${hrs}h ${mins > 0 ? mins + "m" : ""}`.trim() : `${mins}m`;
    return {
      title: pick([
        `Extended stays averaging ${durationStr} today`,
        "Long parking sessions characterising today's activity",
        "High average duration suggests all-day parkers",
      ]),
      summary: `Vehicles are staying an average of ${durationStr} today, ${derived.avgDurationDiffMins && derived.avgDurationDiffMins > 0 ? `${derived.avgDurationDiffMins} minutes longer than yesterday.` : "indicating extended use patterns."} With ${t.checkIns} check-ins and ${t.occupancyPct}% occupancy, slot turnover is slower than usual. Revenue stands at ₹${t.revenue}.`,
      recommendation: pick([
        "Consider time-limit policies during peak hours to improve slot turnover.",
        "Notify long-stay vehicles if additional charge tiers apply after 2 hours.",
        "Monitor long-stay concentration and free up high-demand slots proactively.",
      ]),
      priority: "medium",
      trend: d.trend,
      confidence: 87,
      source: "ai",
    };
  }

  // ── Scenario: Stable day (default) ───────────────────────────────────────────
  const changeDesc = Math.abs(d.checkInChangePct) < 5
    ? "on par with"
    : d.checkInChangePct > 0
      ? `${d.checkInChangePct}% ahead of`
      : `${Math.abs(d.checkInChangePct)}% below`;

  return {
    title: pick([
      "Operations running smoothly today",
      "Stable parking activity across all zones",
      "Consistent performance matching yesterday's levels",
      "Steady operations with balanced demand today",
    ]),
    summary: `Today's parking activity is ${changeDesc} yesterday, with ${t.checkIns} check-ins recorded and ${t.occupancyPct}% occupancy.${t.revenue > 0 ? ` Revenue stands at ₹${t.revenue}${d.revenueChangePct !== 0 ? ` (${pct(d.revenueChangePct)} vs yesterday)` : ""}.` : ""}${t.peakHour ? ` Peak traffic was observed around ${t.peakHour}.` : ""} ${t.remainingSlots} of ${t.totalSlots} slots remain available.`,
    recommendation: pick([
      `Maintain current staffing levels and monitor ${t.mostUsedType} slot availability.`,
      "Continue standard operations — no immediate adjustments required.",
      `Conduct a routine check on ${t.mostUsedType} zone readiness for the afternoon.`,
      "Keep gates staffed and review end-of-day revenue targets with your team.",
    ]),
    priority: "low",
    trend: d.trend,
    confidence: 88,
    source: "ai",
  };
}

// ─── AI Callers ───────────────────────────────────────────────────────────────

async function callGemini(prompt) {
  const payload = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      maxOutputTokens: 500,
      temperature: 0.4,
    },
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5_000); // 5s timeout

  let res;
  try {
    res = await fetch(`${GEMINI_API_URL}?key=${env.GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Gemini API ${res.status}: ${errText.slice(0, 200)}`);
  }

  const data = await res.json();
  const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
  return parseAIResponse(rawText);
}

async function callOpenAI(prompt) {
  const payload = {
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 500,
    temperature: 0.4,
    response_format: { type: "json_object" },
  };

  const res = await fetch(OPENAI_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`OpenAI API ${res.status}: ${errText}`);
  }

  const data = await res.json();
  const rawText = data?.choices?.[0]?.message?.content || "";
  return parseAIResponse(rawText);
}

// ─── Response Parser / Validator ──────────────────────────────────────────────

function parseAIResponse(rawText) {
  if (!rawText || rawText.trim().length === 0) {
    throw new Error("AI returned empty response");
  }

  let parsed;
  try {
    // 1. Try to strip markdown code fences
    let clean = rawText.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();

    // 2. Try to extract the first {...} block in case there is surrounding prose
    const jsonMatch = clean.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      clean = jsonMatch[0];
    }

    parsed = JSON.parse(clean);
  } catch (e) {
    throw new Error(`Failed to parse AI JSON: ${rawText.slice(0, 300)}`);
  }

  // Validate required fields — allow partial responses by using defaults
  const title = String(parsed.title || "Parking activity overview").slice(0, 100);
  const summary = String(parsed.summary || "").slice(0, 500);
  const recommendation = String(parsed.recommendation || "Monitor operations throughout the day.").slice(0, 200);
  const priority = ["high", "medium", "low"].includes(parsed.priority) ? parsed.priority : "medium";
  const trend = ["up", "down", "stable"].includes(parsed.trend) ? parsed.trend : "stable";
  const confidence = Math.min(100, Math.max(0, Number(parsed.confidence) || 80));

  if (!summary) {
    throw new Error("AI response has empty summary field");
  }

  return { title, summary, recommendation, priority, trend, confidence, source: "ai" };
}

// ─── Main Export ──────────────────────────────────────────────────────────────

/**
 * Generate an AI insight from analytics.
 * Tries Gemini → OpenAI → local deterministic fallback.
 */
export async function generateInsight(analytics) {
  const prompt = buildPrompt(analytics);

  // 1. Try Gemini
  if (env.GEMINI_API_KEY) {
    try {
      console.log("[InsightAI] Calling Gemini...");
      const result = await callGemini(prompt);
      console.log("[InsightAI] Gemini succeeded.");
      return result;
    } catch (err) {
      console.warn("[InsightAI] Gemini failed:", err.message);
    }
  }

  // 2. Try OpenAI
  if (env.OPENAI_API_KEY) {
    try {
      console.log("[InsightAI] Calling OpenAI...");
      const result = await callOpenAI(prompt);
      console.log("[InsightAI] OpenAI succeeded.");
      return result;
    } catch (err) {
      console.warn("[InsightAI] OpenAI failed:", err.message);
    }
  }

  // 3. Local deterministic fallback
  console.warn("[InsightAI] No AI API available. Using local fallback.");
  return generateLocalFallback(analytics);
}
