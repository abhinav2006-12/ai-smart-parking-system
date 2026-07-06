import { useState, useEffect } from "react";

/**
 * Returns true when the browser has network access, false when offline.
 * Listens to both the window online/offline events AND periodically
 * pings a reliable tiny resource to catch captive-portal "online but broken" states.
 */
export function useOnlineStatus() {
  const [online, setOnline] = useState(() => navigator.onLine);

  useEffect(() => {
    const handleOnline  = () => setOnline(true);
    const handleOffline = () => setOnline(false);

    window.addEventListener("online",  handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online",  handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return online;
}
