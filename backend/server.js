import app from "./app.js";
import { env } from "./config/env.js";

const PORT = env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`=================================================`);
  console.log(`  ParkPilot Admin AI Backend listening on port ${PORT} `);
  console.log(`  Mode: Standalone Express Server`);
  console.log(`  Supabase URL: ${env.SUPABASE_URL || "Not configured"}`);
  console.log(`  AI Status: ${env.OPENAI_API_KEY ? "OpenAI configured" : env.GEMINI_API_KEY ? "Gemini configured" : "Offline local mode active"}`);
  console.log(`=================================================`);
});
