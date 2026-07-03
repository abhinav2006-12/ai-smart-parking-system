import { createClient } from "@supabase/supabase-js";

const GEMINI_API_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

const supabase = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

async function readRawBody(req) {
  if (req.body) {
    if (typeof req.body === "object") {
      return JSON.stringify(req.body);
    }
    return Buffer.isBuffer(req.body) ? req.body.toString() : String(req.body);
  }
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks).toString();
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(200).json({ 
      error: { 
        type: "unconfigured", 
        message: "GEMINI_API_KEY is missing in the server environment variables." 
      } 
    });
  }

  if (!supabase) {
    return res.status(500).json({ error: "Supabase configuration is missing on the server." });
  }

  try {
    const rawBody = await readRawBody(req);
    const body = JSON.parse(rawBody || "{}");

    const { messages, adminId } = body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Missing or invalid messages array." });
    }
    if (!adminId) {
      return res.status(401).json({ error: "Unauthorized: Missing admin identifier." });
    }

    // 1. Verify that the admin account exists, is active, and had a recent heartbeat (within 10 minutes)
    const { data: admin, error: adminErr } = await supabase
      .from("admin_accounts")
      .select("id, name, role, is_active, last_active_at")
      .eq("id", adminId)
      .eq("is_active", true)
      .single();

    if (adminErr || !admin) {
      return res.status(401).json({ error: "Unauthorized: Inactive or invalid administrator credentials." });
    }

    const lastActiveTime = admin.last_active_at ? new Date(admin.last_active_at).getTime() : 0;
    const now = Date.now();
    // 10 minutes max buffer for heartbeats
    if (now - lastActiveTime > 10 * 60 * 1000) {
      return res.status(401).json({ error: "Unauthorized: Admin session expired." });
    }

    // 2. Fetch the live system data snapshot
    // settings
    const { data: settings } = await supabase
      .from("settings")
      .select("total_slots, slots_by_type, rates, currency")
      .eq("id", 1)
      .single();

    // active vehicles
    const { data: activeVehicles } = await supabase
      .from("vehicles")
      .select("type")
      .eq("status", "parked");

    // today's revenue (in IST: UTC + 5:30)
    const nowMs = Date.now();
    const nowIST = new Date(nowMs + 5.5 * 60 * 60 * 1000);
    const startOfTodayIST = new Date(nowIST.getUTCFullYear(), nowIST.getUTCMonth(), nowIST.getUTCDate());
    const startOfTodayTimestamp = startOfTodayIST.getTime() - 5.5 * 60 * 60 * 1000;

    const { data: revenueLog } = await supabase
      .from("revenue_log")
      .select("amount")
      .gte("date", startOfTodayTimestamp);

    // recent vehicles list (last 15 records)
    const { data: recentVehicles } = await supabase
      .from("vehicles")
      .select("number, type, entry_time, exit_time, status, fee, duration_mins")
      .order("entry_time", { ascending: false })
      .limit(15);

    // recent activity log list (last 15 records)
    const { data: recentActivities } = await supabase
      .from("admin_activity_log")
      .select("admin_name, admin_role, action, detail, created_at")
      .order("created_at", { ascending: false })
      .limit(15);

    // 3. Process aggregates for snapshot
    const totalSlots = settings?.total_slots || 0;
    const slotsByType = settings?.slots_by_type || { standard: 0, ev: 0, taxi: 0 };
    const rates = settings?.rates || { standard: 0, ev: 0, taxi: 0 };
    const currency = settings?.currency || "INR";

    const parkedCount = activeVehicles?.length || 0;
    const freeSlots = Math.max(0, totalSlots - parkedCount);

    const occupiedByType = { standard: 0, ev: 0, taxi: 0 };
    if (activeVehicles) {
      activeVehicles.forEach((v) => {
        occupiedByType[v.type] = (occupiedByType[v.type] || 0) + 1;
      });
    }

    const freeByType = {
      standard: Math.max(0, (slotsByType.standard || 0) - occupiedByType.standard),
      ev: Math.max(0, (slotsByType.ev || 0) - occupiedByType.ev),
      taxi: Math.max(0, (slotsByType.taxi || 0) - occupiedByType.taxi),
    };

    const todayRevenue = (revenueLog || []).reduce((sum, r) => sum + Number(r.amount), 0);

    const snapshot = {
      timestamp: new Date().toISOString(),
      occupancy: {
        total_slots: totalSlots,
        occupied_slots: parkedCount,
        free_slots: freeSlots,
        by_type: {
          standard: { occupied: occupiedByType.standard, allocated: slotsByType.standard || 0, free: freeByType.standard },
          ev: { occupied: occupiedByType.ev, allocated: slotsByType.ev || 0, free: freeByType.ev },
          taxi: { occupied: occupiedByType.taxi, allocated: slotsByType.taxi || 0, free: freeByType.taxi },
        }
      },
      today_revenue: {
        amount: todayRevenue,
        currency,
      },
      rates: {
        standard: rates.standard,
        ev: rates.ev,
        taxi: rates.taxi,
      },
      recent_vehicles: (recentVehicles || []).map((v) => ({
        number: v.number,
        type: v.type,
        status: v.status,
        entry_time: v.entry_time ? new Date(v.entry_time).toISOString() : null,
        exit_time: v.exit_time ? new Date(v.exit_time).toISOString() : null,
        fee: v.fee,
        duration_mins: v.duration_mins,
      })),
      recent_activities: (recentActivities || []).map((a) => ({
        operator: a.admin_name,
        role: a.admin_role,
        action: a.action,
        timestamp: a.created_at,
        detail: a.detail,
      }))
    };

    // 4. Construct System Instructions
    const systemPrompt = `You are the ParkPilot Operations Copilot, an internal operations assistant for authenticated parking facility staff.
The user chatting with you is currently authenticated as: ${admin.name} (Role: ${admin.role}).

Here is the live data snapshot of the smart parking system (captured at ${snapshot.timestamp}):
${JSON.stringify(snapshot, null, 2)}

Your Operational Rules:
1. Assume the user is an authorized staff member (Security, Gate Manager, or Head Admin). You can discuss internal statistics, revenues, occupancy, and rates with them.
2. Base all numeric answers (occupied spaces, revenues, rates) STRICTLY on the data given in the snapshot context above. Never estimate, guess, or make up figures. If a requested metric or live state is not covered in the snapshot, politely state that you cannot access that live information right now.
3. This chat session is READ-ONLY. You can explain, analyze, format, and search the provided snapshot. However, you must NOT write or claim to trigger any database modifications (such as deleting vehicle records, changing rates, deactivating accounts, or checking out vehicles). If the user asks you to perform a write action, politely decline and specify that you only have read-only permissions on this console.
4. Keep responses highly clear, concise (under 150 words), and operational. Use step-by-step instructions or bullet points if asked about how to do administrative procedures in the dashboard.
5. If the operator greets you, reply professionally and ask how you can help manage the facility today.`;

    // 5. Map conversation from Anthropic roles ("user" | "assistant") to Gemini roles ("user" | "model")
    const geminiContents = messages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content || "" }]
    }));

    // Google Gemini API expects system instruction separately
    const payload = {
      contents: geminiContents,
      generationConfig: {
        maxOutputTokens: 1000,
      },
      systemInstruction: {
        parts: [{ text: systemPrompt }]
      }
    };

    const geminiUrl = `${GEMINI_API_BASE_URL}?key=${apiKey}`;
    const geminiResponse = await fetch(geminiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!geminiResponse.ok) {
      const errText = await geminiResponse.text().catch(() => "");
      console.error(`[Admin Chatbot Proxy] Gemini API error ${geminiResponse.status}:`, errText);
      return res.status(502).json({ error: `Gemini API returned error: ${geminiResponse.status}` });
    }

    const data = await geminiResponse.json();
    const replyText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "Sorry, I couldn't generate a response.";

    // Return the response mapped back into the Anthropic-like format the client UI expects
    return res.status(200).json({
      content: [
        {
          type: "text",
          text: replyText
        }
      ]
    });
  } catch (err) {
    console.error("[Admin Chatbot Proxy] Exception failed:", err);
    return res.status(500).json({ error: "Failed to process chat message." });
  }
}
