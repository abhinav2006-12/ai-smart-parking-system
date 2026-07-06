import { useContext, useState, useEffect, useRef } from "react";
import { ChatbotContext } from "../../context/ChatbotContext";
import ChatMessage from "./ChatMessage";
import ChatInput from "./ChatInput";
import TypingIndicator from "./TypingIndicator";
import SuggestionCards from "./SuggestionCards";
import ChatHistory from "./ChatHistory";

export default function ChatWindow({ adminUser, onClose }) {
  const {
    messages,
    loading,
    error,
    chatHistory,
    activeSessionId,
    sendMessage,
    clearChat,
    createNewSession,
    loadSession,
    deleteSession,
    voiceSupported,
    isListening,
    startListening,
    stopListening
  } = useContext(ChatbotContext);

  const [showHistory, setShowHistory] = useState(false);
  const scrollRef = useRef(null);

  // Auto scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const handleSuggestionSelect = (query) => {
    sendMessage(query);
  };

  return (
    <div
      className="admin-chatbot-window"
      style={{
        position: "fixed",
        right: 24,
        bottom: 90,
        width: 420,
        height: 600,
        borderRadius: 14,
        background: "var(--surface)",
        border: "1px solid var(--border)",
        boxShadow: "0 12px 36px rgba(0, 0, 0, 0.16)",
        display: "flex",
        flexDirection: "column",
        zIndex: 1000,
        overflow: "hidden",
        fontFamily: "'Inter', sans-serif",
        // Glassmorphic overlay effect
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)"
      }}
    >
      {/* ── HEADER ── */}
      <div
        className="chatbot-header"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "14px 18px",
          background: "linear-gradient(135deg, var(--surface-muted) 0%, var(--surface) 100%)",
          borderBottom: "1px solid var(--border)",
          flexShrink: 0
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* Pulsing online status indicator */}
          <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--success)" }} />
            <div 
              style={{ 
                position: "absolute", 
                width: 8, 
                height: 8, 
                borderRadius: "50%", 
                background: "var(--success)", 
                animation: "ping 1.5s infinite" 
              }} 
            />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: "var(--ink)", display: "flex", alignItems: "center", gap: 4 }}>
              ParkPilot AI Copilot
            </div>
            <div style={{ fontSize: 10.5, color: "var(--muted)", fontWeight: 500 }}>Active Database Agent</div>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {/* History Toggle */}
          <button
            onClick={() => setShowHistory(true)}
            className="header-action-btn"
            style={{
              background: "transparent",
              border: "none",
              color: "var(--muted)",
              cursor: "pointer",
              padding: 6,
              borderRadius: 6,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.2s"
            }}
            title="Chat history"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 8v4l3 3" />
              <path d="M3.05 11a9 9 0 1 1 .5 4M3 5v6h6" />
            </svg>
          </button>

          {/* Clear Current Chat */}
          {messages.length > 0 && (
            <button
              onClick={clearChat}
              className="header-action-btn"
              style={{
                background: "transparent",
                border: "none",
                color: "var(--muted)",
                cursor: "pointer",
                padding: 6,
                borderRadius: 6,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.2s"
              }}
              title="Clear active chat"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18" />
                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
              </svg>
            </button>
          )}

          {/* Close Window */}
          <button
            onClick={onClose}
            className="header-action-btn"
            style={{
              background: "transparent",
              border: "none",
              color: "var(--muted)",
              cursor: "pointer",
              padding: 6,
              borderRadius: 6,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.2s"
            }}
            title="Close chatbot"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      {/* ── BODY (Scroll Area) ── */}
      <div
        ref={scrollRef}
        className="chatbot-body"
        style={{
          flex: 1,
          overflowY: "auto",
          background: "var(--surface)",
          position: "relative",
          display: "flex",
          flexDirection: "column"
        }}
      >
        {messages.length === 0 ? (
          /* Empty State View */
          <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div
              style={{
                padding: "24px 20px",
                textAlign: "center",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                flex: 1,
                gap: 12
              }}
            >
              {/* Bot Welcome Icon */}
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: "50%",
                  background: "var(--accent-soft)",
                  color: "var(--accent)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 24,
                  fontWeight: 700,
                  marginBottom: 8,
                  border: "1px solid var(--border)"
                }}
              >
                🤖
              </div>
              <h3 style={{ margin: 0, fontSize: 16, color: "var(--ink)", fontWeight: 700 }}>
                Welcome, {adminUser?.name}!
              </h3>
              <p style={{ margin: 0, fontSize: 13, color: "var(--muted)", lineHeight: 1.5 }}>
                I am your real-time administrative database assistant. Ask me questions about slot counts, bookings, weekly revenue, active admins, EV slot metrics, or locate a parked vehicle.
              </p>
            </div>

            {/* Suggestions cards shown at bottom of empty state */}
            <SuggestionCards onSelect={handleSuggestionSelect} loading={loading} />
          </div>
        ) : (
          /* Message List */
          <div style={{ padding: "20px 16px 8px 16px" }}>
            {messages.map((msg) => (
              <ChatMessage key={msg.id} message={msg} adminName={adminUser?.name || "Admin"} />
            ))}
            
            {/* Loading Indicator */}
            {loading && <TypingIndicator />}
          </div>
        )}
      </div>

      {/* ── FOOTER (Text area) ── */}
      <ChatInput
        onSend={sendMessage}
        loading={loading}
        voiceSupported={voiceSupported}
        isListening={isListening}
        onStartListening={startListening}
        onStopListening={stopListening}
      />

      {/* ── CHAT HISTORY SIDE PANEL (Slide-over drawer) ── */}
      {showHistory && (
        <ChatHistory
          history={chatHistory}
          activeId={activeSessionId}
          onSelect={loadSession}
          onDelete={deleteSession}
          onNewChat={createNewSession}
          onClose={() => setShowHistory(false)}
        />
      )}

      {/* CSS keyframe animations for ping */}
      <style>{`
        @keyframes ping {
          75%, 100% {
            transform: scale(2.5);
            opacity: 0;
          }
        }
        .header-action-btn:hover {
          background: var(--surface-muted) !important;
          color: var(--ink) !important;
        }
      `}</style>
    </div>
  );
}
