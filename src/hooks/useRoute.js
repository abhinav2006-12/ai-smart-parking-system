import { useState, useEffect, useCallback } from "react";

/**
 * Minimal client-side router based on window.location.pathname.
 * Keeps the app dependency-free while still giving real, bookmarkable
 * URLs (e.g. visiting /admin directly opens the admin login).
 */
export function useRoute() {
  const [path, setPath] = useState(() => window.location.pathname);

  useEffect(() => {
    const onPopState = () => setPath(window.location.pathname);
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const navigate = useCallback((to) => {
    if (to !== window.location.pathname) {
      window.history.pushState({}, "", to);
    }
    setPath(to);
  }, []);

  return [path, navigate];
}
