import { useState } from "react";
import GuestMenu from "./GuestMenu";
import CheckInFlow from "./CheckInFlow";
import CheckOutFlow from "./CheckOutFlow";

export default function GuestPanel({ store, updateStore, onBack }) {
  const [view, setView] = useState("menu"); // menu | checkin | checkout

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <GuestHeader onBack={view === "menu" ? onBack : () => setView("menu")} backLabel={view === "menu" ? "Home" : "Counter"} />
      <div style={{ flex: 1, padding: "24px 20px 60px" }}>
        {view === "menu" && <GuestMenu onCheckIn={() => setView("checkin")} onCheckOut={() => setView("checkout")} store={store} />}
        {view === "checkin" && <CheckInFlow store={store} updateStore={updateStore} onDone={() => setView("menu")} />}
        {view === "checkout" && <CheckOutFlow store={store} updateStore={updateStore} onDone={() => setView("menu")} />}
      </div>
    </div>
  );
}

function GuestHeader({ onBack, backLabel }) {
  return (
    <div style={{ borderBottom: "1px solid var(--border)", background: "var(--surface)", transition: "background-color 0.3s ease, border-bottom-color 0.3s ease, color 0.3s ease" }}>
      <div style={{ padding: "18px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button onClick={onBack} className="btn btn-ghost" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14, padding: "6px 10px" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          {backLabel}
        </button>
        <span style={{ color: "var(--muted)", fontSize: 12 }}>Gate Counter</span>
      </div>
    </div>
  );
}
