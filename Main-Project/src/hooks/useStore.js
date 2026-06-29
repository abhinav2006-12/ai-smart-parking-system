import { useState, useEffect, useCallback, useRef } from "react";
import { loadStore, saveStore, defaultStore } from "../lib/storage";
import { loadStoreFromSupabase, syncStoreToSupabase } from "../lib/supabase";

export function useStore() {
  const [store, setStore] = useState(defaultStore);
  const [loading, setLoading] = useState(true);
  const lastSavedStoreRef = useRef(null);

  // 1. Load store from Supabase on mount
  useEffect(() => {
    async function initStore() {
      try {
        const cloudData = await loadStoreFromSupabase();
        if (cloudData) {
          setStore(cloudData);
          lastSavedStoreRef.current = JSON.parse(JSON.stringify(cloudData));
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

  // 2. Sync changes to local storage & Supabase
  useEffect(() => {
    if (loading || !lastSavedStoreRef.current) return;

    // Save to local storage as fallback
    saveStore(store);

    // Sync state changes to Supabase in the background
    syncStoreToSupabase(store, lastSavedStoreRef.current)
      .then(() => {
        lastSavedStoreRef.current = JSON.parse(JSON.stringify(store));
      })
      .catch((err) => {
        console.error("Failed to sync store to Supabase:", err);
      });
  }, [store, loading]);

  const updateStore = useCallback((updater) => {
    setStore((prev) => (typeof updater === "function" ? updater(prev) : updater));
  }, []);

  return [store, updateStore, loading];
}
