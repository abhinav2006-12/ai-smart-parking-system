import { Suspense, lazy, useState, useEffect, useCallback } from "react";
import { useStore } from "./hooks/useStore";
import { useRoute } from "./hooks/useRoute";
import { useTheme } from "./hooks/useTheme";
import { useOnlineStatus } from "./hooks/useOnlineStatus";
import HomeScreen from "./components/HomeScreen";
import AdminLogin from "./components/AdminLogin";
import AmbientBackground from "./components/AmbientBackground";
import VehicleLoader from "./components/VehicleLoader";
import OfflinePage from "./components/OfflinePage";

import { logActivity } from "./lib/activityLog";
import { supabase } from "./lib/supabase";
import ParkPilotChatbot from "./components/ParkPilotChatbot";

const AdminPanel = lazy(() => import("./components/AdminPanel"));
const GuestPanel = lazy(() => import("./components/GuestPanel"));

// Admin is intentionally not linked from anywhere in the UI — it's only
// reachable by visiting this path directly (e.g. yoursite.com/admin)
const ADMIN_PATH = "/admin";



export default function App() {
  const [store, updateStore, loading, refreshStore] = useStore();
  const [path, navigate] = useRoute();
  const isAdminRoute = path.replace(/\/+$/, "") === ADMIN_PATH || path === ADMIN_PATH;
  const [theme, toggleTheme] = useTheme();
  const isOnline = useOnlineStatus();
  const [adminAuthed, setAdminAuthed] = useState(false);
  const [adminUser, setAdminUser] = useState(null);

  // Heartbeat to update last_active_at in the database for the active admin
  useEffect(() => {
    if (!adminUser || !supabase) return;
    const ping = async () => {
      try {
        await supabase
          .from("admin_accounts")
          .update({ last_active_at: new Date().toISOString() })
          .eq("id", adminUser.id);
      } catch (e) {
        console.error("Heartbeat error:", e);
      }
    };
    ping();
    const id = setInterval(ping, 20000);
    return () => clearInterval(id);
  }, [adminUser]);



  const handleAdminLogin = useCallback((user) => {
    setAdminUser(user);
    setAdminAuthed(true);
  }, []);

  const handleAdminLogout = useCallback(async () => {
    if (adminUser) {
      await logActivity(adminUser, "Logged out");
      if (supabase) {
        try {
          await supabase
            .from("admin_accounts")
            .update({ last_active_at: null })
            .eq("id", adminUser.id);
        } catch (e) {
          console.error("Error clearing status:", e);
        }
      }
    }
    setAdminAuthed(false);
    setAdminUser(null);
    navigate("/");
  }, [navigate, adminUser]);

  const [guestOpen, setGuestOpen] = useState(false);

  // If we navigate away from /admin, reset session states
  useEffect(() => {
    if (!isAdminRoute) {
      setAdminAuthed(false);
      setAdminUser(null);
    }
  }, [isAdminRoute]);

  // ── Session Inactivity Timeout ──────────────────────────────────────────
  useEffect(() => {
    if (!adminAuthed) return;

    const INACTIVITY_TIMEOUT = 10 * 60 * 1000; // 10 minutes
    let timeoutId;

    const resetTimer = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        console.log("[session] Inactivity timeout reached, logging out...");
        handleAdminLogout();
      }, INACTIVITY_TIMEOUT);
    };

    const events = ["mousedown", "mousemove", "keypress", "scroll", "touchstart"];
    
    resetTimer();
    events.forEach((name) => window.addEventListener(name, resetTimer));

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      events.forEach((name) => window.removeEventListener(name, resetTimer));
    };
  }, [adminAuthed, handleAdminLogout]);

  let content;

  // Show offline page immediately if no network
  if (!isOnline) {
    return (
      <>
        <AmbientBackground />
        <div className="app-content">
          <OfflinePage onRetry={() => window.location.reload()} />
        </div>
      </>
    );
  }

  if (loading) {
    content = <LoadingScreen />;
  } else if (isAdminRoute) {
    content = !adminAuthed ? (
      <AdminLogin
        theme={theme}
        onToggleTheme={toggleTheme}
        onSuccess={handleAdminLogin}
        onBack={() => navigate("/")}
      />
    ) : (
      <Suspense fallback={<LoadingScreen />}>
        <AdminPanel
          store={store}
          updateStore={updateStore}
          onLogout={handleAdminLogout}
          theme={theme}
          onToggleTheme={toggleTheme}
          onRefresh={refreshStore}
          adminUser={adminUser}
        />
      </Suspense>
    );
  } else if (guestOpen) {
    content = (
      <Suspense fallback={<LoadingScreen />}>
        <GuestPanel
          store={store}
          updateStore={updateStore}
          onBack={() => setGuestOpen(false)}
          theme={theme}
          onToggleTheme={toggleTheme}
        />
      </Suspense>
    );
  } else {
    content = <HomeScreen onGuest={() => setGuestOpen(true)} theme={theme} onToggleTheme={toggleTheme} />;
  }

  return (
    <>
      <AmbientBackground />
      <div className="app-content">{content}</div>
      {/* Floating chatbot — available on every screen, hidden on /admin */}
      {!isAdminRoute && <ParkPilotChatbot />}
    </>
  );
}

function LoadingScreen() {
  return <VehicleLoader />;
}
