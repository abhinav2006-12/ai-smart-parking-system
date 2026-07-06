import { useState, useEffect, useCallback, useRef } from "react";
import { loadStore, saveStore, defaultStore, migrateStore } from "../lib/storage";
import { loadStoreFromSupabase, syncStoreToSupabase, supabase, normalizeStatusFromDb } from "../lib/supabase";

// Helper: map a raw Supabase vehicle row (snake_case) to camelCase
const parseTime = (val) => {
  if (!val) return null;
  const num = Number(val);
  if (isNaN(num)) {
    return new Date(val).getTime();
  }
  if (num > 0 && num < 10000000000) {
    return num * 1000;
  }
  return num;
};


function mapVehicleRow(v) {
  return {
    id: v.id,
    number: v.number,
    type: v.type,
    entryTime: parseTime(v.entry_time),
    exitTime: parseTime(v.exit_time),
    status: normalizeStatusFromDb(v.status),
    fee: v.fee ? Number(v.fee) : null,
    durationMins: v.duration_mins,
    entryPhoto: v.entry_photo,
    exitPhoto: v.exit_photo,
  };
}

function mapRevenueRow(r) {
  return {
    id: r.id,
    vehicleId: r.vehicle_id,
    amount: Number(r.amount),
    date: parseTime(r.date),
  };
}

export function useStore() {
  const [store, setStore] = useState(defaultStore);
  const [loading, setLoading] = useState(true);
  const lastSavedStoreRef = useRef(null);
  // Track whether an outgoing sync is in-flight so realtime echoes don't cause loops
  const syncingRef = useRef(false);

  // 1. Load store from Supabase on mount
  useEffect(() => {
    async function initStore() {
      try {
        const cloudData = await loadStoreFromSupabase();
        if (cloudData) {
          // Migrate any legacy "disabled" type keys before using the data
          const migratedData = migrateStore(cloudData) || cloudData;
          // Always write fresh Supabase data to localStorage, overwriting any stale cache
          saveStore(migratedData);
          setStore(migratedData);
          lastSavedStoreRef.current = JSON.parse(JSON.stringify(migratedData));
        } else {
          // If no cloud settings exist, populate defaults from localStorage or default template
          const localData = loadStore();
          setStore(localData);
          lastSavedStoreRef.current = JSON.parse(JSON.stringify(localData));

          // Seed database settings row
          await syncStoreToSupabase(localData, defaultStore());
        }
      } catch (err) {
        console.error("Failed to load store from Supabase, using localStorage fallback:", err);
        const localData = loadStore();
        setStore(localData);
        lastSavedStoreRef.current = JSON.parse(JSON.stringify(localData));
      } finally {
        setLoading(false);
      }
    }
    initStore();
  }, []);

  // 2. Sync outgoing changes to local storage & Supabase
  useEffect(() => {
    if (loading || !lastSavedStoreRef.current) return;

    // Save to local storage as fallback
    saveStore(store);

    // Sync state changes to Supabase in the background
    syncingRef.current = true;
    syncStoreToSupabase(store, lastSavedStoreRef.current)
      .then(() => {
        lastSavedStoreRef.current = JSON.parse(JSON.stringify(store));
      })
      .catch((err) => {
        console.error("Failed to sync store to Supabase:", err);
      })
      .finally(() => {
        syncingRef.current = false;
      });
  }, [store, loading]);

  // 3. Real-time Supabase subscriptions — sync DB changes into local state
  useEffect(() => {
    if (!supabase) return;

    const channel = supabase
      .channel("parkpilot-realtime")
      // ── vehicles ──────────────────────────────────────────────────────────
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "vehicles" },
        (payload) => {
          const newVehicle = mapVehicleRow(payload.new);
          setStore((prev) => {
            if (prev.vehicles.some((v) => v.id === newVehicle.id)) return prev;
            const nextVehicles = [newVehicle, ...prev.vehicles];
            if (lastSavedStoreRef.current) {
              lastSavedStoreRef.current.vehicles = JSON.parse(JSON.stringify(nextVehicles));
            }
            return { ...prev, vehicles: nextVehicles };
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "vehicles" },
        (payload) => {
          const updated = mapVehicleRow(payload.new);
          setStore((prev) => {
            const nextVehicles = prev.vehicles.map((v) =>
              v.id === updated.id ? updated : v
            );
            if (lastSavedStoreRef.current) {
              lastSavedStoreRef.current.vehicles = JSON.parse(JSON.stringify(nextVehicles));
            }
            return { ...prev, vehicles: nextVehicles };
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "vehicles" },
        (payload) => {
          const deletedId = payload.old?.id;
          if (!deletedId) return;
          setStore((prev) => {
            const nextVehicles = prev.vehicles.filter((v) => v.id !== deletedId);
            if (lastSavedStoreRef.current) {
              lastSavedStoreRef.current.vehicles = JSON.parse(JSON.stringify(nextVehicles));
            }
            return { ...prev, vehicles: nextVehicles };
          });
        }
      )
      // ── revenue_log ───────────────────────────────────────────────────────
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "revenue_log" },
        (payload) => {
          const newEntry = mapRevenueRow(payload.new);
          setStore((prev) => {
            if (prev.revenueLog.some((r) => r.id === newEntry.id)) return prev;
            const nextRevenue = [...prev.revenueLog, newEntry];
            if (lastSavedStoreRef.current) {
              lastSavedStoreRef.current.revenueLog = JSON.parse(JSON.stringify(nextRevenue));
            }
            return { ...prev, revenueLog: nextRevenue };
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "revenue_log" },
        (payload) => {
          const deletedId = payload.old?.id;
          if (!deletedId) return;
          setStore((prev) => {
            const nextRevenue = prev.revenueLog.filter((r) => r.id !== deletedId);
            if (lastSavedStoreRef.current) {
              lastSavedStoreRef.current.revenueLog = JSON.parse(JSON.stringify(nextRevenue));
            }
            return { ...prev, revenueLog: nextRevenue };
          });
        }
      )
      // ── settings ──────────────────────────────────────────────────────────
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "settings" },
        (payload) => {
          if (payload.new && payload.new.id === 1) {
            const newSettings = {
              totalSlots: payload.new.total_slots,
              slotsByType: payload.new.slots_by_type,
              rates: payload.new.rates,
              upiVpa: payload.new.upi_vpa,
              upiPayeeName: payload.new.upi_payee_name,
              currency: payload.new.currency,
            };
            setStore((prev) => {
              if (JSON.stringify(prev.settings) === JSON.stringify(newSettings)) return prev;
              if (lastSavedStoreRef.current) {
                lastSavedStoreRef.current.settings = JSON.parse(JSON.stringify(newSettings));
              }
              return { ...prev, settings: newSettings };
            });
          }
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.log("[realtime] Connected to Supabase Realtime");
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const updateStore = useCallback((updater) => {
    setStore((prev) => (typeof updater === "function" ? updater(prev) : updater));
  }, []);

  // Manual refresh — re-fetches all data from Supabase
  const refreshStore = useCallback(async () => {
    try {
      const cloudData = await loadStoreFromSupabase();
      if (cloudData) {
        saveStore(cloudData);
        setStore(cloudData);
        lastSavedStoreRef.current = JSON.parse(JSON.stringify(cloudData));
      }
    } catch (err) {
      console.error("Failed to refresh store from Supabase:", err);
    }
  }, []);

  return [store, updateStore, loading, refreshStore];
}

