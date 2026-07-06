import { useState, useEffect, useCallback, useRef } from "react";

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes client-side guard

let clientCache = null; // { data, fetchedAt }

/**
 * Hook to fetch and cache the AI dashboard insight.
 * Returns { insight, loading, error, refresh, lastUpdated }
 */
export function useAIInsight() {
  const [insight, setInsight] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const isMountedRef = useRef(true);

  const fetchInsight = useCallback(async (forceRefresh = false) => {
    // Use client cache if fresh and not forcing a refresh
    if (!forceRefresh && clientCache && Date.now() - clientCache.fetchedAt < CACHE_TTL_MS) {
      setInsight(clientCache.data);
      setLastUpdated(new Date(clientCache.fetchedAt));
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/dashboard-insight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ forceRefresh }),
      });

      if (!res.ok) {
        throw new Error(`Server responded with ${res.status}`);
      }

      const data = await res.json();

      if (!isMountedRef.current) return;

      // Store in client-side cache
      clientCache = { data, fetchedAt: Date.now() };

      setInsight(data);
      setLastUpdated(new Date());
    } catch (err) {
      console.error("[useAIInsight] Fetch error:", err);
      if (!isMountedRef.current) return;

      setError(err.message);

      // If we have stale cache, show it rather than nothing
      if (clientCache) {
        setInsight(clientCache.data);
        setLastUpdated(new Date(clientCache.fetchedAt));
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  // Initial fetch on mount
  useEffect(() => {
    isMountedRef.current = true;
    fetchInsight(false);
    return () => {
      isMountedRef.current = false;
    };
  }, [fetchInsight]);

  const refresh = useCallback(() => {
    fetchInsight(true);
  }, [fetchInsight]);

  return { insight, loading, error, refresh, lastUpdated };
}
