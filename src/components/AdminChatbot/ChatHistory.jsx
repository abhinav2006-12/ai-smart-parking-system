export default function ChatHistory({ 
  history, 
  activeId, 
  onSelect, 
  onDelete, 
  onNewChat, 
  onClose 
}) {
  return (
    <div
      className="chat-history-drawer"
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        background: "var(--surface)",
        zIndex: 100,
        display: "flex",
        flexDirection: "column",
        borderRight: "1px solid var(--border)",
        borderRadius: 14,
        animation: "slideIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards"
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "16px 20px",
          borderBottom: "1px solid var(--border)",
          background: "var(--surface-muted)"
        }}
      >
        <span style={{ fontWeight: 600, fontSize: 15, color: "var(--ink)" }}>Chat History</span>
        <button
          onClick={onClose}
          style={{
            background: "transparent",
            border: "none",
            color: "var(--muted)",
            cursor: "pointer",
            padding: 4
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Action panel */}
      <div style={{ padding: 12, borderBottom: "1px solid var(--border)" }}>
        <button
          onClick={() => {
            onNewChat();
            onClose();
          }}
          style={{
            width: "100%",
            background: "var(--accent)",
            color: "#FFF",
            border: "none",
            borderRadius: 8,
            padding: "10px",
            fontSize: 13.5,
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New Chat
        </button>
      </div>

      {/* History Items list */}
      <div 
        style={{ 
          flex: 1, 
          overflowY: "auto", 
          padding: 8,
          display: "flex",
          flexDirection: "column",
          gap: 6
        }}
      >
        {history.length === 0 ? (
          <div 
            style={{ 
              textAlign: "center", 
              padding: "40px 20px", 
              color: "var(--muted)", 
              fontSize: 13.5 
            }}
          >
            No previous conversations found.
          </div>
        ) : (
          history.map((session) => {
            const isActive = session.id === activeId;
            const dateStr = new Date(session.timestamp).toLocaleDateString([], {
              month: "short",
              day: "numeric"
            });

            return (
              <div
                key={session.id}
                onClick={() => {
                  onSelect(session.id);
                  onClose();
                }}
                className={`history-item ${isActive ? "active" : ""}`}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "12px 14px",
                  borderRadius: 8,
                  background: isActive ? "var(--accent-soft)" : "transparent",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  border: "1px solid",
                  borderColor: isActive ? "var(--accent)" : "transparent"
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: 2, overflow: "hidden", flex: 1 }}>
                  <span 
                    style={{ 
                      fontWeight: isActive ? 600 : 500, 
                      fontSize: 13.5, 
                      color: isActive ? "var(--accent)" : "var(--ink)",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis"
                    }}
                  >
                    {session.title}
                  </span>
                  <span style={{ fontSize: 10.5, color: "var(--muted)" }}>
                    {dateStr} &bull; {session.messages.length} messages
                  </span>
                </div>

                <button
                  onClick={(e) => onDelete(session.id, e)}
                  className="history-delete-btn"
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "var(--muted)",
                    cursor: "pointer",
                    padding: 4,
                    borderRadius: 4,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "all 0.15s ease"
                  }}
                  title="Delete chat session"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                </button>
              </div>
            );
          })
        )}
      </div>

      <style>{`
        @keyframes slideIn {
          from { transform: translateX(-100%); }
          to { transform: translateX(0); }
        }
        .history-item:hover {
          background: var(--surface-muted) !important;
        }
        .history-item.active:hover {
          background: var(--accent-soft) !important;
        }
        .history-delete-btn:hover {
          color: var(--danger) !important;
          background: var(--danger-soft) !important;
        }
      `}</style>
    </div>
  );
}
