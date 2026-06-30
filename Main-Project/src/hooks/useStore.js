import { useState, useEffect, useCallback, useRef } from "react";
import { loadStore, saveStore, defaultStore, migrateStore } from "../lib/storage";
import { loadStoreFromSupabase, syncStoreToSupabase, supabase } from "../lib/supabase";

// Helper: map a raw Supabase vehicle row (snake_case) to camelCase
const parseTime = (val) => {
  if (!val) return null;
  const num = Number(val);
  return isNaN(num) ? new Date(val).getTime() : num;
};

function mapVehicleRow(v) {
  return {
    id: v.id,
    number: v.number,
    type: v.type,
    entryTime: parseTime(v.entry_time),
    exitTime: parseTime(v.exit_time),
    status: v.status,
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
            // Skip if we already have it (our own write echoed back)
            if (prev.vehicles.some((v) => v.id === newVehicle.id)) return prev;
            return { ...prev, vehicles: [newVehicle, ...prev.vehicles] };
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "vehicles" },
        (payload) => {
          const updated = mapVehicleRow(payload.new);
          setStore((prev) => ({
            ...prev,
            vehicles: prev.vehicles.map((v) =>
              v.id === updated.id ? updated : v
            ),
          }));
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "vehicles" },
        (payload) => {
          const deletedId = payload.old?.id;
          if (!deletedId) return;
          setStore((prev) => ({
            ...prev,
            vehicles: prev.vehicles.filter((v) => v.id !== deletedId),
          }));
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
            return { ...prev, revenueLog: [...prev.revenueLog, newEntry] };
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "revenue_log" },
        (payload) => {
          const deletedId = payload.old?.id;
          if (!deletedId) return;
          setStore((prev) => ({
            ...prev,
            revenueLog: prev.revenueLog.filter((r) => r.id !== deletedId),
          }));
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

