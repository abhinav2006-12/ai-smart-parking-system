/**
 * Utility to identify user intent and extract query parameters from natural language.
 */
export const intentDetector = {
  /**
   * Detect intent and parameters from the text.
   * @param {string} text 
   * @returns {{ intent: string, params: object }}
   */
  detect(text) {
    const query = text.toLowerCase().trim();
    const params = {};

    // 1. Vehicle Plate Extraction
    // Loose regex for plates: Matches 2-3 letters, optional space/dash, 2-4 digits, optional letters/digits.
    // Examples: KL07AB1234, MH 12 DE 5678, DL-3C-1234, etc.
    const plateRegex = /\b([a-z]{2}[ -]?\d{1,2}[ -]?[a-z\d]{1,3}[ -]?\d{4})\b/gi;
    const plateMatch = query.match(plateRegex);
    
    if (plateMatch) {
      // Clean extracted plate to search standard alphanumeric format
      params.plateNumber = plateMatch[0].toUpperCase().replace(/[^A-Z0-9]/g, "");
    } else {
      // Fallback search for any 5-10 character alphanumeric word that has both letters and numbers
      const words = query.split(/\s+/);
      const alphaNumWord = words.find(w => {
        const clean = w.replace(/[^a-z0-9]/gi, "");
        return clean.length >= 4 && clean.length <= 11 && /[a-z]/i.test(clean) && /\d/.test(clean);
      });
      if (alphaNumWord) {
        params.plateNumber = alphaNumWord.toUpperCase().replace(/[^A-Z0-9]/g, "");
      }
    }

    // 2. Intent Classification based on keywords
    if (params.plateNumber && (query.includes("find") || query.includes("search") || query.includes("locate") || query.includes("where") || query.includes("vehicle") || query.includes("car"))) {
      return { intent: "vehicle_search", params };
    }

    if (query.includes("available") || query.includes("empty") || query.includes("free slots") || query.includes("slots left") || query.includes("how many slots")) {
      return { intent: "available_slots", params };
    }

    if (query.includes("today's booking") || query.includes("today booking") || query.includes("bookings today") || query.includes("today's entries") || query.includes("entries today") || query.includes("today's check") || query.includes("today check")) {
      return { intent: "todays_bookings", params };
    }

    if (query.includes("revenue") || query.includes("money") || query.includes("earn") || query.includes("sales") || query.includes("payment") || query.includes("income")) {
      return { intent: "weekly_revenue", params };
    }

    if (query.includes("active user") || query.includes("active admin") || query.includes("active account") || query.includes("who is log") || query.includes("current admin")) {
      return { intent: "active_users", params };
    }

    if (query.includes("cancel") || query.includes("void")) {
      return { intent: "cancelled_bookings", params };
    }

    if (query.includes("ev") || query.includes("electric")) {
      return { intent: "ev_slots", params };
    }

    if (query.includes("peak") || query.includes("busiest") || query.includes("busy hour") || query.includes("peak hour")) {
      return { intent: "peak_hours", params };
    }

    if (query.includes("notification") || query.includes("log") || query.includes("recent action") || query.includes("history logs") || query.includes("audit")) {
      return { intent: "show_logs", params };
    }

    // Direct search matching plate number as fallback if a plate was found in any other context
    if (params.plateNumber) {
      return { intent: "vehicle_search", params };
    }

    return { intent: "general", params };
  }
};
