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
        // Fetch structural Supabase snapshot for grounding all admin chat requests
        dbContext.systemSnapshot = {
          occupancy: await supabaseService.getSlotAvailability().catch(() => null),
          todayRevenue: await supabaseService.getTodaysRevenue().catch(() => 0),
          recentFailedOrFlaggedANPR: await supabaseService.getRecentFailedOrFlaggedANPR().catch(() => []),
        };

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
            // For general conversational queries, we rely on the systemSnapshot already injected above
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
  },

  /**
   * Process vehicle record summary requests. Exposes POST /api/chat/summary
   */
  async handleSummary(req, res) {
    const { vehicle, stats } = req.body;

    if (!vehicle) {
      return res.status(400).json({ error: "Missing vehicle object in request body." });
    }

    try {
      console.log(`[ChatController] Generating summary for vehicle: ${vehicle.number}`);
      const summaryText = await aiService.generateSummary(vehicle, stats || {});
      return res.status(200).json({ summary: summaryText });
    } catch (err) {
      console.error("[ChatController] Error generating summary:", err);
      return res.status(500).json({ error: "Failed to generate vehicle summary." });
    }
  }
};
