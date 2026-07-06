export default function TypingIndicator() {
  return (
    <div
      className="typing-indicator-container"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "8px 16px",
        margin: "0 0 16px 48px", // Matches bot avatar spacing
        background: "var(--surface-muted)",
        border: "1px solid var(--border)",
        borderRadius: "0px 14px 14px 14px",
        width: "fit-content"
      }}
    >
      <span style={{ fontSize: 12, color: "var(--muted)", fontWeight: 500 }}>ParkPilot is thinking</span>
      <div 
        className="typing-dots"
        style={{
          display: "flex",
          gap: 4,
          alignItems: "center"
        }}
      >
        <div className="typing-dot" style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--muted)", animation: "bounce 1.4s infinite ease-in-out both" }} />
        <div className="typing-dot" style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--muted)", animation: "bounce 1.4s infinite ease-in-out both 0.2s" }} />
        <div className="typing-dot" style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--muted)", animation: "bounce 1.4s infinite ease-in-out both 0.4s" }} />
      </div>
      
      {/* Insert inline styles to make dots bounce */}
      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0); }
          40% { transform: scale(1.0); }
        }
      `}</style>
    </div>
  );
}
