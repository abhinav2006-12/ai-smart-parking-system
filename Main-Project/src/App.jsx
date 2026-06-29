import { Suspense, lazy, useState, useEffect } from "react";
import { useStore } from "./hooks/useStore";
import { useRoute } from "./hooks/useRoute";
import { useTheme } from "./hooks/useTheme";
import HomeScreen from "./components/HomeScreen";
import AdminLogin from "./components/AdminLogin";
import AmbientBackground from "./components/AmbientBackground";
import VehicleLoader from "./components/VehicleLoader";

const AdminPanel = lazy(() => import("./components/AdminPanel"));
const GuestPanel = lazy(() => import("./components/GuestPanel"));

// Admin is intentionally not linked from anywhere in the UI — it's only
// reachable by visiting this path directly (e.g. yoursite.com/admin).
const ADMIN_PATH = "/admin";

export default function App() {
  const [store, updateStore, loading] = useStore();
  const [path, navigate] = useRoute();
  const [theme, toggleTheme] = useTheme();
  const [adminAuthed, setAdminAuthed] = useState(false);

  const isAdminRoute = path.replace(/\/+$/, "") === ADMIN_PATH || path === ADMIN_PATH;

  // Guest check-in/check-out is internal app state (not URL-based) since
  // it's a single continuous counter flow, not something anyone needs to
  // deep-link into.
  const [guestOpen, setGuestOpen] = useState(false);

  // If we navigate away from /admin, drop the authed session so coming
  // back always requires the PIN again.
  useEffect(() => {
    if (!isAdminRoute) setAdminAuthed(false);
  }, [isAdminRoute]);

  let content;

  if (loading) {
    content = <LoadingScreen />;
  } else if (isAdminRoute) {
    content = !adminAuthed ? (
      <AdminLogin onSuccess={() => setAdminAuthed(true)} onBack={() => navigate("/")} />
    ) : (
      <Suspense fallback={<LoadingScreen />}>
        <AdminPanel
          store={store}
          updateStore={updateStore}
          onLogout={() => {
            setAdminAuthed(false);
            navigate("/");
          }}
        />
      </Suspense>
    );
  } else if (guestOpen) {
    content = (
      <Suspense fallback={<LoadingScreen />}>
        <GuestPanel store={store} updateStore={updateStore} onBack={() => setGuestOpen(false)} />
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
