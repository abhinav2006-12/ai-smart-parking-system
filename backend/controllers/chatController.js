import { intentDetector } from "../utils/intentDetector.js";
import { supabaseService } from "../services/supabaseService.js";
import { aiService } from "../services/aiService.js";

export const chatController = {
  /**
   * Process incoming chat requests. Exposes POST /api/chat
   */
  async handleChat(req, res) {
    const { messages } = req.body;
    const adminUser = req.adminUser; // Injected by authenticateAdmin middleware

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "Missing or invalid messages array." });
    }

    const lastMessageObj = messages.at(-1);
    const lastUserMessage = lastMessageObj?.role === "user" ? lastMessageObj.content : "";

    if (!lastUserMessage) {
      return res.status(400).json({ error: "Last message content is empty." });
    }

    try {
      console.log(`[ChatController] Processing message from '${adminUser.name}': "${lastUserMessage}"`);

      // 1. Detect Intent and Extract Parameters
      const { intent, params } = intentDetector.detect(lastUserMessage);
      console.log(`[ChatController] Detected intent: '${intent}' with params:`, params);

      // 2. Retrieve Data based on Intent
      const dbContext = {};
      
      try {
        switch (intent) {
          case "available_slots":
            dbContext.slots = await supabaseService.getSlotAvailability();
            break;
          case "todays_bookings":
            dbContext.bookings = await supabaseService.getTodaysBookings();
            break;
          case "weekly_revenue":
            dbContext.revenue = await supabaseService.getWeeklyRevenue();
            break;
          case "active_users":
            dbContext.admins = await supabaseService.getActiveAdmins();
            break;
          case "vehicle_search":
            if (params.plateNumber) {
              dbContext.searchResults = await supabaseService.findVehicle(params.plateNumber);
              dbContext.searchPlate = params.plateNumber;
            } else {
              dbContext.searchResults = [];
            }
            break;
          case "cancelled_bookings":
            dbContext.cancelled = await supabaseService.getCancelledBookings();
            break;
          case "ev_slots":
            dbContext.evSlots = await supabaseService.getEvOccupancy();
            break;
          case "peak_hours":
            dbContext.peakHours = await supabaseService.getPeakHours();
            break;
          case "show_logs":
            dbContext.logs = await supabaseService.getRecentLogs();
            break;
          default:
            // For general conversational queries, inject a lightweight system summary (slots, active counts)
            // so the LLM is always grounded in the live state
            dbContext.systemSummary = {
              slots: await supabaseService.getSlotAvailability().catch(() => null),
              activeAdmins: (await supabaseService.getActiveAdmins().catch(() => null))?.activeAdmins?.length || 0,
              todaysBookingsCount: (await supabaseService.getTodaysBookings().catch(() => null))?.length || 0,
            };
            break;
        }
      } catch (dbErr) {
        console.error("[ChatController] Database query error:", dbErr);
        dbContext.error = "Failed to query real-time database. Data may be stale.";
      }

      // 3. Generate response via OpenAI or Gemini API
      const responseText = await aiService.generateResponse(messages, dbContext, adminUser);

      // 4. Return structured JSON
      return res.status(200).json({
        content: [
          {
            type: "text",
            text: responseText,
          }
        ]
      });

    } catch (err) {
      console.error("[ChatController] Error processing chat request:", err);
      return res.status(500).json({ error: "Failed to generate AI response. Please try again later." });
    }
  }
};
