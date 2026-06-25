import { useState, Suspense, lazy } from "react";
import { useStore } from "./hooks/useStore";
import HomeScreen from "./components/HomeScreen";
import AdminLogin from "./components/AdminLogin";

const AdminPanel = lazy(() => import("./components/AdminPanel"));
const GuestPanel = lazy(() => import("./components/GuestPanel"));

export default function App() {
  const [store, updateStore] = useStore();
  const [mode, setMode] = useState("home"); // home | admin | guest
  const [adminAuthed, setAdminAuthed] = useState(false);

  if (mode === "home") {
    return <HomeScreen onAdmin={() => setMode("admin")} onGuest={() => setMode("guest")} />;
  }

  if (mode === "admin") {
    if (!adminAuthed) {
      return <AdminLogin onSuccess={() => setAdminAuthed(true)} onBack={() => setMode("home")} />;
    }
    return (
      <Suspense fallback={<LoadingScreen />}>
        <AdminPanel
          store={store}
          updateStore={updateStore}
          onLogout={() => {
            setAdminAuthed(false);
            setMode("home");
          }}
        />
      </Suspense>
    );
  }

  if (mode === "guest") {
    return (
      <Suspense fallback={<LoadingScreen />}>
        <GuestPanel store={store} updateStore={updateStore} onBack={() => setMode("home")} />
      </Suspense>
    );
  }

  return null;
}

function LoadingScreen() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)" }}>
      Loading…
    </div>
  );
}
