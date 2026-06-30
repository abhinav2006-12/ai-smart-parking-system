import { Suspense, lazy, useState, useEffect, useCallback, useRef } from "react";
import { useStore } from "./hooks/useStore";
import { useRoute } from "./hooks/useRoute";
import { useTheme } from "./hooks/useTheme";
import HomeScreen from "./components/HomeScreen";
import AdminLogin from "./components/AdminLogin";
import AmbientBackground from "./components/AmbientBackground";
import VehicleLoader from "./components/VehicleLoader";
import {
  claimAdminSession,
  refreshAdminSession,
  releaseAdminSession,
  isSessionOccupied,
  forceResetAdminSession,
} from "./lib/supabase";

const AdminPanel = lazy(() => import("./components/AdminPanel"));
const GuestPanel = lazy(() => import("./components/GuestPanel"));

// Admin is intentionally not linked from anywhere in the UI — it's only
// reachable by visiting this path directly (e.g. yoursite.com/admin)
const ADMIN_PATH = "/admin";

// How often to ping the heartbeat (5 minutes)
const HEARTBEAT_INTERVAL = 5 * 60 * 1000;
// How often to verify we still own the session (2 seconds)
const VERIFY_INTERVAL = 2 * 1000;

export default function App() {
  const [store, updateStore, loading] = useStore();
  const [path, navigate] = useRoute();
  const isAdminRoute = path.replace(/\/+$/, "") === ADMIN_PATH || path === ADMIN_PATH;
  const [theme, toggleTheme] = useTheme();
  const [adminAuthed, setAdminAuthed] = useState(false);
  const [sessionKicked, setSessionKicked] = useState(false);
  const [sessionBlocked, setSessionBlocked] = useState(false); // Another device is active
  const tokenRef = useRef(null);   // Our current session token
  const channelRef = useRef(null); // BroadcastChannel for same-browser tabs

  // ── Same-browser tab enforcement via BroadcastChannel ──────────────────
  useEffect(() => {
    const ch = new BroadcastChannel("parkpilot_admin_session");
    channelRef.current = ch;

    ch.onmessage = (e) => {
      if (e.data === "admin-login") {
        // Another tab in this browser logged in — kick this one
        setAdminAuthed(false);
        setSessionKicked(true);
        tokenRef.current = null;
      } else if (e.data === "admin-logout") {
        setSessionKicked(false);
        setSessionBlocked(false);
      }
    };

    return () => ch.close();
  }, []);

  // ── Heartbeat: refresh session_at every 5 min while authed ─────────────
  useEffect(() => {
    if (!adminAuthed) return;
    const id = setInterval(() => {
      refreshAdminSession(tokenRef.current);
    }, HEARTBEAT_INTERVAL);
    return () => clearInterval(id);
  }, [adminAuthed]);

  // ── Session verify: check every 60s that we still own the token ─────────
  useEffect(() => {
    if (!adminAuthed) return;
    const id = setInterval(async () => {
      if (!tokenRef.current) return;
      const result = await claimAdminSession(tokenRef.current);
      // If claimAdminSession says it's blocked AND not our own token, we were kicked
      if (!result.ok) {
        setAdminAuthed(false);
        setSessionKicked(true);
        tokenRef.current = null;
      }
    }, VERIFY_INTERVAL);
    return () => clearInterval(id);
  }, [adminAuthed]);

  // ── Initial session check: show blocked banner if another device is active ──
  useEffect(() => {
    if (isAdminRoute && !adminAuthed) {
      const checkInitialSession = async () => {
        const occupied = await isSessionOccupied();
        setSessionBlocked(occupied);
      };
      checkInitialSession();
    }
  }, [isAdminRoute, adminAuthed]);

  // ── Release session when tab/window is closed ───────────────────────────
  useEffect(() => {
    const onUnload = () => releaseAdminSession(tokenRef.current);
    window.addEventListener("beforeunload", onUnload);
    return () => window.removeEventListener("beforeunload", onUnload);
  }, []);

  const handleAdminLogin = useCallback(async (token) => {
    tokenRef.current = token;
    setSessionKicked(false);
    setSessionBlocked(false);
    setAdminAuthed(true);
    // Notify all other tabs in this browser
    channelRef.current?.postMessage("admin-login");
  }, []);

  const handleAdminLogout = useCallback(async () => {
    await releaseAdminSession(tokenRef.current);
    tokenRef.current = null;
    setAdminAuthed(false);
    setSessionKicked(false);
    setSessionBlocked(false);
    navigate("/");
    channelRef.current?.postMessage("admin-logout");
  }, [navigate]);

  const [guestOpen, setGuestOpen] = useState(false);

  // If we navigate away from /admin, release the session and reset session states
  useEffect(() => {
    if (!isAdminRoute) {
      if (tokenRef.current) {
        releaseAdminSession(tokenRef.current);
        tokenRef.current = null;
      }
      setAdminAuthed(false);
      setSessionKicked(false);
      setSessionBlocked(false);
    }
  }, [isAdminRoute]);

  let content;

  if (loading) {
    content = <LoadingScreen />;
  } else if (isAdminRoute) {
    content = !adminAuthed ? (
      <AdminLogin
        theme={theme}
        onToggleTheme={toggleTheme}
        onSuccess={handleAdminLogin}
        onBack={() => navigate("/")}
        sessionKicked={sessionKicked}
        sessionBlocked={sessionBlocked}
        onSessionBlockedCheck={async () => {
          setSessionBlocked(false);
          const result = await claimAdminSession();
          if (!result.ok) {
            setSessionBlocked(true);
            return false;
          }
          return { ok: true, token: result.token };
        }}
        onSessionReset={async () => {
          await forceResetAdminSession();
          setSessionBlocked(false);
          channelRef.current?.postMessage("admin-logout");
        }}
      />
    ) : (
      <Suspense fallback={<LoadingScreen />}>
        <AdminPanel
          store={store}
          updateStore={updateStore}
          onLogout={handleAdminLogout}
          theme={theme}
          onToggleTheme={toggleTheme}
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
    </>
  );
}

function LoadingScreen() {
  return <VehicleLoader />;
}
