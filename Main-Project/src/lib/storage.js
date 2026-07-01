const STORE_KEY = "parkpilot_v1";

export function defaultStore() {
  return {
    settings: {
      totalSlots: 50,
      slotsByType: { standard: 30, ev: 12, taxi: 8 },
      rates: {
        standard: { hourly: 20, minHours: 1 },
        ev: { hourly: 30, minHours: 1 },
        taxi: { hourly: 10, minHours: 1 },
        peakHours: { start: "17:00", end: "21:00", multiplier: 1.5, enabled: true }
      },
      upiVpa: "parkpilot@upi",
      upiPayeeName: "ParkPilot Parking",
      currency: "INR",
    },
    vehicles: [],
    revenueLog: [],
  };
}

/**
 * Migrates legacy store data: renames "disabled" vehicle type to "taxi"
 * in settings (slotsByType, rates) and in any saved vehicle records.
 */
export function migrateStore(data) {
  if (!data) return data;

  // Migrate settings
  if (data.settings) {
    const s = data.settings;

    // slotsByType: move disabled -> taxi
    if (s.slotsByType && "disabled" in s.slotsByType && !("taxi" in s.slotsByType)) {
      s.slotsByType.taxi = s.slotsByType.disabled;
      delete s.slotsByType.disabled;
    }

    // rates: move disabled -> taxi
    if (s.rates && "disabled" in s.rates && !("taxi" in s.rates)) {
      s.rates.taxi = s.rates.disabled;
      delete s.rates.disabled;
    }
  }

  // Migrate vehicle records
  if (Array.isArray(data.vehicles)) {
    data.vehicles = data.vehicles.map((v) =>
      v.type === "disabled" ? { ...v, type: "taxi" } : v
    );
  }

  return data;
}

export function loadStore() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return migrateStore(parsed) || defaultStore();
    }
  } catch (e) {
    console.error("Failed to load store", e);
  }
  return defaultStore();
}

export function saveStore(store) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(store));
  } catch (e) {
    console.error("Failed to save store", e);
  }
}

