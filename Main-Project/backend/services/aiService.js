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
    return `You are the ParkPilot Admin Copilot, an internal operations assistant for authenticated staff.
You help parking lot administrators, attendants, and managers query, analyze, and explain the system state using natural language.

Your active user:
- Name: ${adminUser.name}
- Role: ${adminUser.role} (head, gate_manager, or security)
- Permission scope: ${adminUser.role === "head" ? "Full access to settings, finances, logs, and accounts" : "Operational access to slots, check-ins, and payments"}

REAL-TIME SYSTEM STATE (SUPABASE SNAPSHOT):
${JSON.stringify(dbContext, null, 2)}

INSTRUCTIONS & RULES:
1. Ground all answers strictly in the REAL-TIME SYSTEM STATE provided. Base numeric answers (occupancy stats, today's revenue, logs, and fee calculations) ONLY on the data given — never guess, fabricate, or hallucinate figures. If data is not present in the snapshot, state that it is unavailable.
2. Assume the user is authenticated staff. You can discuss occupancy, revenue breakdown, fee calculations, and recent flagged/failed ANPR entries.
3. SCOPE CONSTRAINT: You are read-only. You must NOT trigger or simulate write actions (e.g. deleting users, modifying fees, marking vehicle checkouts). If the user asks you to "do" something rather than "explain" or "analyze" (e.g., "delete this vehicle log" or "change the standard rate to 50"), you must state directly that you cannot execute write/administrative operations and instruct them to use the dashboard controls manually.
4. Format lists or reports using markdown tables, bullet points, and bold text for readability.
5. Keep responses helpful, concise, and focused on active parking management operations.`;
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
      reply += `* Accessible: **${s.availableSlotsByType.disabled}** left (of ${s.slotsByType.disabled})\n`;
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
  },

  /**
   * Explains why a vehicle record is normal or an outlier based on list-wide stats context.
   */
  async generateSummary(vehicle, stats) {
    const prompt = `You are ParkPilot AI Outlier Explainer.
Your job is to explain in 1 or 2 short sentences why a specific vehicle's parking record is unusual (an outlier) or normal compared to list-wide statistics.

VEHICLE RECORD:
${JSON.stringify(vehicle, null, 2)}

LIST-WIDE STATS CONTEXT:
${JSON.stringify(stats, null, 2)}

INSTRUCTIONS:
1. Base your explanation strictly on the provided vehicle record and stats. Do not fabricate names, locations, or dates.
2. If the vehicle is unusual (i.e. has outlier flags or rare types), write a 1-2 sentence explanation of why. e.g. "This vehicle stayed parked for 9.5 hours, over 3x the average of 2.8 hours today."
3. If the vehicle is normal, output: "Duration and fee are within the typical range for today."
4. Keep the output plain text, under 40 words, and exactly 1-2 sentences. Do not include markdown formatting or quotes around the output.`;

    if (env.GEMINI_API_KEY) {
      try {
        return await this.callGemini([{ role: "user", content: "Analyze and explain this vehicle's statistics." }], prompt);
      } catch (err) {
        console.error("[AIService] Gemini summary generation failed, using local fallback. Error:", err.message);
        return this.generateLocalSummaryFallback(vehicle, stats);
      }
    } else if (env.OPENAI_API_KEY) {
      try {
        return await this.callOpenAI([{ role: "user", content: "Analyze and explain this vehicle's statistics." }], prompt);
      } catch (err) {
        console.error("[AIService] OpenAI summary generation failed, using local fallback. Error:", err.message);
        return this.generateLocalSummaryFallback(vehicle, stats);
      }
    } else {
      return this.generateLocalSummaryFallback(vehicle, stats);
    }
  },

  /**
   * Deterministic local summary generation as offline fallback.
   */
  generateLocalSummaryFallback(vehicle, stats) {
    const reasons = stats?.vehicleOutlierReasons?.[vehicle.id] || [];
    if (reasons.length === 0) {
      return "Duration and fee are within the typical range for today.";
    }

    const explanations = [];
    if (reasons.includes("duration")) {
      const avgStr = stats?.duration?.mean ? ` (average today is ${Math.round(stats.duration.mean)} mins)` : "";
      explanations.push(`The parking duration of ${vehicle.durationMins || 0} minutes is significantly higher than typical${avgStr}.`);
    }
    if (reasons.includes("fee")) {
      const avgStr = stats?.fee?.mean ? ` (average today is ₹${Math.round(stats.fee.mean)})` : "";
      explanations.push(`The fee charged is ₹${vehicle.fee || 0}, which is outside the normal range${avgStr}.`);
    }
    if (reasons.includes("entryHour")) {
      const hour = new Date(vehicle.entryTime).getHours();
      explanations.push(`The entry time at ${hour}:00 is a rare check-in hour for this facility.`);
    }
    if (reasons.includes("rareType")) {
      explanations.push(`The vehicle type "${vehicle.type}" is uncommon in today's records.`);
    }

    if (explanations.length > 0) {
      return explanations.join(" ");
    }
    return "This vehicle's records show minor statistical deviations from the daily typical range.";
  }
};
