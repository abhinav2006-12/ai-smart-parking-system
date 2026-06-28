import { useState, useEffect, useCallback } from "react";
import { loadStore, saveStore } from "../lib/storage";

export function useStore() {
  const [store, setStore] = useState(loadStore);

  useEffect(() => {
    saveStore(store);
  }, [store]);

  const updateStore = useCallback((updater) => {
    setStore((prev) => (typeof updater === "function" ? updater(prev) : updater));
  }, []);

  return [store, updateStore];
}
