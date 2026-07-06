import { env } from "../config/env.js";

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";
const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

export const aiService = {
  /**
   * Formulate system prompt, assemble database context, and generate chat completion.
   * @param {Array} messages - Chat message history [{ role, content }]
   * @param {object} dbContext - Retrieved Supabase data
   * @param {object} adminUser - Active admin info
   */
  async generateResponse(messages, dbContext, adminUser) {
    const systemPrompt = this.buildSystemPrompt(dbContext, adminUser);

    if (env.GEMINI_API_KEY) {
      try {
        return await this.callGemini(messages, systemPrompt);
      } catch (err) {
        console.error("[AIService] Gemini API call failed. Falling back to local offline mode. Error:", err.message);
        return this.generateLocalFallback(messages.at(-1)?.content || "", dbContext);
      }
    } else if (env.OPENAI_API_KEY) {
      try {
        return await this.callOpenAI(messages, systemPrompt);
      } catch (err) {
        console.error("[AIService] OpenAI API call failed. Falling back to local offline mode. Error:", err.message);
        return this.generateLocalFallback(messages.at(-1)?.content || "", dbContext);
      }
    } else {
      console.warn("[AIService] No API Key configured. Falling back to rule-based answers.");
      return this.generateLocalFallback(messages.at(-1)?.content || "", dbContext);
    }
  },

  /**
   * Build structural system instruction with DB context injected
   */
  buildSystemPrompt(dbContext, adminUser) {
    return `You are ParkPilot AI Assistant, a professional parking operations manager.
You help parking lot administrators, attendants, and managers query the system state using natural language.

Your active user:
- Name: ${adminUser.name}
- Role: ${adminUser.role} (head, gate_manager, or security)
- Permission scope: ${adminUser.role === "head" ? "Full access to settings, finances, logs, and accounts" : "Operational access to slots, check-ins, and payments"}

REAL-TIME SYSTEM STATE (SUPABASE SNAPSHOT):
${JSON.stringify(dbContext, null, 2)}

INSTRUCTIONS & RULES:
1. Always base stats, numbers, names, and counts directly on the REAL-TIME SYSTEM STATE above.
2. If the snapshot data is null or empty, state that no active records were found.
3. NEVER fabricate revenue, slots, or vehicle info. If data is not available, state so.
4. Format lists or reports using markdown tables, bullet points, and bold text for readability.
5. In vehicle lists, include columns: Vehicle Plate, Slot Type, Entry Time, Status, Fee.
6. When explaining settings, refer to the hourly rates: Standard = Standard slots hourly fee, EV = EV slots hourly fee, etc.
7. Keep responses helpful, concise, and business-focused. Encourage proactive parking management.`;
  },

  /**
   * HTTP POST to Google Gemini API
   */
  async callGemini(messages, systemPrompt) {
    try {
      // Map roles from Claude-like (user/assistant) to Gemini-like (user/model)
      const geminiContents = messages.map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content || "" }]
      }));

      const payload = {
        contents: geminiContents,
        generationConfig: {
          maxOutputTokens: 1000,
          temperature: 0.3,
        },
        systemInstruction: {
          parts: [{ text: systemPrompt }]
        }
      };

      const res = await fetch(`${GEMINI_API_URL}?key=${env.GEMINI_API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Gemini API returned status ${res.status}: ${errText}`);
      }

      const data = await res.json();
      return data?.candidates?.[0]?.content?.parts?.[0]?.text || "Sorry, I couldn't process the response.";
    } catch (err) {
      console.error("[AIService] Gemini API error:", err);
      throw err;
    }
  },

  /**
   * HTTP POST to OpenAI Chat Completions API
   */
  async callOpenAI(messages, systemPrompt) {
    try {
      const openAiMessages = [
        { role: "system", content: systemPrompt },
        ...messages.map((m) => ({
          role: m.role === "assistant" ? "assistant" : "user",
          content: m.content
        }))
      ];

      const payload = {
        model: "gpt-4o-mini",
        messages: openAiMessages,
        max_tokens: 1000,
        temperature: 0.3,
      };

      const res = await fetch(OPENAI_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${env.OPENAI_API_KEY}`
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`OpenAI API returned status ${res.status}: ${errText}`);
      }

      const data = await res.json();
      return data?.choices?.[0]?.message?.content || "Sorry, I couldn't generate a response.";
    } catch (err) {
      console.error("[AIService] OpenAI API error:", err);
      throw err;
    }
  },

  /**
   * Fallback engine if no API keys are present (runs entirely offline/locally)
   */
  generateLocalFallback(text, dbContext) {
    const q = text.toLowerCase();
    let reply = `### [Offline Local Mode] ParkPilot Assistant\n\n*Note: No LLM API Key is configured in environment variables. Running in structured local fallback mode.*\n\n`;

    if (dbContext.slots) {
      const s = dbContext.slots;
      reply += `**Parking Slot Occupancy Summary:**\n`;
      reply += `- Total Slots: **${s.totalSlots}**\n`;
      reply += `- Currently Parked: **${s.totalParked}** vehicles\n`;
      reply += `- Available Slots: **${s.totalAvailable}**\n\n`;
      reply += `**Breakdown of Slots Left:**\n`;
      reply += `* Standard: **${s.availableSlotsByType.standard}** left (of ${s.slotsByType.standard})\n`;
      reply += `* EV Chargers: **${s.availableSlotsByType.ev}** left (of ${s.slotsByType.ev})\n`;
      reply += `* Taxi: **${s.availableSlotsByType.taxi}** left (of ${s.slotsByType.taxi})\n`;
      return reply;
    }

    if (dbContext.bookings) {
      const b = dbContext.bookings;
      reply += `**Today's Bookings Snapshot:**\n`;
      reply += `Total entries today: **${b.length}**\n\n`;
      if (b.length > 0) {
        reply += `| Vehicle | Type | Entry Time | Status | Fee |\n`;
        reply += `| --- | --- | --- | --- | --- |\n`;
        b.slice(0, 5).forEach((v) => {
          const time = new Date(Number(v.entry_time)).toLocaleTimeString();
          reply += `| **${v.number}** | ${v.type} | ${time} | ${v.status} | ${v.fee ? "₹" + v.fee : "-"} |\n`;
        });
        if (b.length > 5) reply += `\n*...and ${b.length - 5} more entries today.*`;
      } else {
        reply += `No vehicles checked in today yet.`;
      }
      return reply;
    }

    if (dbContext.revenue) {
      const r = dbContext.revenue;
      reply += `**Weekly Revenue Report:**\n`;
      reply += `- Total Earnings (Past 7 Days): **₹${r.totalRevenue}**\n`;
      reply += `- Number of completed checkout fees: **${r.logCount}**\n\n`;
      reply += `**Daily Earnings:**\n`;
      Object.entries(r.dailyBreakdown).forEach(([day, amt]) => {
        reply += `- ${day}: **₹${amt}**\n`;
      });
      return reply;
    }

    if (dbContext.searchResults) {
      const sr = dbContext.searchResults;
      reply += `**Vehicle Search Results:**\n`;
      if (sr.length > 0) {
        reply += `Found **${sr.length}** record(s) matching your request:\n\n`;
        reply += `| Vehicle Plate | Type | Checked In | Checked Out | Status | Fee |\n`;
        reply += `| --- | --- | --- | --- | --- | --- |\n`;
        sr.forEach((v) => {
          const entry = new Date(Number(v.entry_time)).toLocaleString();
          const exit = v.exit_time ? new Date(Number(v.exit_time)).toLocaleString() : "-";
          reply += `| **${v.number}** | ${v.type} | ${entry} | ${exit} | **${v.status.toUpperCase()}** | ${v.fee ? "₹" + v.fee : "-"} |\n`;
        });
      } else {
        reply += `No vehicles found in database records matching that plate number.`;
      }
      return reply;
    }

    if (dbContext.cancelled) {
      const c = dbContext.cancelled;
      reply += `**Cancelled Bookings List:**\n`;
      if (c.length > 0) {
        reply += `| Vehicle Plate | Type | Time Checked In | Status |\n`;
        reply += `| --- | --- | --- | --- |\n`;
        c.forEach((v) => {
          const time = new Date(Number(v.entry_time)).toLocaleString();
          reply += `| **${v.number}** | ${v.type} | ${time} | ${v.status} |\n`;
        });
      } else {
        reply += `No cancelled booking entries found in the database.`;
      }
      return reply;
    }

    if (dbContext.peakHours) {
      const ph = dbContext.peakHours;
      reply += `**Parking Peak Hours Report:**\n`;
      reply += `Top busy entry hours (24h format):\n`;
      ph.peakHours.forEach((item, i) => {
        reply += `${i + 1}. **${item.time}** (${item.weight} checkins recorded)\n`;
      });
      return reply;
    }

    if (dbContext.admins) {
      const a = dbContext.admins;
      reply += `**Registered Admins & Active Sessions:**\n`;
      reply += `- Active Admins (Last 5 mins): **${a.activeAdmins.length}**\n`;
      reply += `- Total registered system users: **${a.allAdminsCount}**\n\n`;
      reply += `**Currently Active Sessions:**\n`;
      a.activeAdmins.forEach((adm) => {
        const time = new Date(adm.last_active_at).toLocaleTimeString();
        reply += `- **${adm.name}** (${adm.role}) — last heartbeat at *${time}*\n`;
      });
      return reply;
    }

    reply += `Hello! I am your AI assistant running in offline local fallback mode. I can answer questions about:\n`;
    reply += `- **Slot counts / available parking** ("How many slots are free?")\n`;
    reply += `- **Today's booking records** ("Show today's check-ins")\n`;
    reply += `- **Revenue analytics** ("Weekly revenue stats")\n`;
    reply += `- **Peak parking times** ("Show peak hours")\n`;
    reply += `- **Active staff sessions** ("List logged in admins")\n`;
    reply += `- **Vehicle lookups** ("Find plate KL07AB1234")\n`;
    reply += `- **Cancelled entries** ("Show cancelled slots")\n\n`;
    reply += `Please ask one of these questions or configure your Gemini/OpenAI API key to enable full conversational AI reasoning.`;
    return reply;
  }
};
