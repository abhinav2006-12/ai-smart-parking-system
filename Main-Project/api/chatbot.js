const GEMINI_API_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

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
    // Return a special unconfigured response so the client falls back to local matching
    return res.status(200).json({ 
      error: { 
        type: "unconfigured", 
        message: "GEMINI_API_KEY is missing in the server environment variables." 
      } 
    });
  }

  try {
    const rawBody = await readRawBody(req);
    const body = JSON.parse(rawBody || "{}");

    const { messages, system, max_tokens } = body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Missing or invalid messages array." });
    }

    // Map conversation from Anthropic roles ("user" | "assistant") to Gemini roles ("user" | "model")
    const geminiContents = messages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content || "" }]
    }));

    // Google Gemini API expects system instruction separately
    const payload = {
      contents: geminiContents,
      generationConfig: {
        maxOutputTokens: max_tokens || 1000,
      }
    };

    if (system) {
      payload.systemInstruction = {
        parts: [{ text: system }]
      };
    }

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
      console.error(`[Chatbot Proxy] Gemini API error ${geminiResponse.status}:`, errText);
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
    console.error("[Chatbot Proxy] Exception failed:", err);
    return res.status(500).json({ error: "Failed to process chat message." });
  }
}
