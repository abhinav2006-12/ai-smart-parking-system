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
      },
      upiVpa: "parkpilot@upi",
      upiPayeeName: "ParkPilot Parking",
      currency: "INR",
    },
    vehicles: [],
    revenueLog: [],
  };
}

export function loadStore() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) return JSON.parse(raw);
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
