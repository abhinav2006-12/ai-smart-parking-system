import { useState, useRef, useEffect } from "react";

export default function ChatInput({ 
  onSend, 
  loading, 
  voiceSupported, 
  isListening, 
  onStartListening, 
  onStopListening 
}) {
  const [text, setText] = useState("");
  const textareaRef = useRef(null);

  // Auto-resize textarea heights
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [text]);

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    if (!text.trim() || loading) return;
    onSend(text);
    setText("");
  };

  const handleKeyDown = (e) => {
    // Send on Enter, allow newline on Shift+Enter
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleVoiceClick = () => {
    if (isListening) {
      onStopListening();
    } else {
      onStartListening();
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        display: "flex",
        gap: 8,
        alignItems: "flex-end",
        background: "var(--surface)",
        padding: "10px 14px",
        borderTop: "1px solid var(--border)",
        borderRadius: "0 0 14px 14px",
        position: "relative"
      }}
    >
      {/* Voice input button if supported */}
      {voiceSupported && (
        <button
          type="button"
          onClick={handleVoiceClick}
          className={`voice-btn ${isListening ? "listening" : ""}`}
          style={{
            background: isListening ? "var(--danger-soft)" : "transparent",
            color: isListening ? "var(--danger)" : "var(--muted)",
            border: "none",
            borderRadius: "50%",
            width: 38,
            height: 38,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            flexShrink: 0,
            transition: "all 0.2s ease"
          }}
          title={isListening ? "Stop listening" : "Start voice input"}
        >
          {isListening ? (
            <div className="pulse-dot" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="voice-pulse-svg">
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3zm5 10a1 1 0 0 1-2 0 5 5 0 0 1-8 0 1 1 0 0 1-2 0 7 7 0 0 0 6 6.92V21a1 1 0 0 0 2 0v-2.08A7 7 0 0 0 17 12z" />
              </svg>
            </div>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </svg>
          )}
        </button>
      )}

      {/* Input Textarea */}
      <textarea
        ref={textareaRef}
        rows={1}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={isListening ? "Listening... Speak now" : "Type a parking query (Shift+Enter for newline)..."}
        disabled={loading}
        style={{
          flex: 1,
          background: "var(--surface-muted)",
          color: "var(--ink)",
          border: "1px solid var(--border)",
          borderRadius: 18,
          padding: "10px 16px",
          fontSize: 14,
          fontFamily: "inherit",
          resize: "none",
          outline: "none",
          minHeight: 38,
          maxHeight: 120,
          lineHeight: "1.4",
          transition: "all 0.15s ease"
        }}
      />

      {/* Send Button */}
      <button
        type="submit"
        disabled={!text.trim() || loading}
        style={{
          background: text.trim() && !loading ? "var(--accent)" : "var(--border)",
          color: text.trim() && !loading ? "#FFFFFF" : "var(--muted)",
          border: "none",
          borderRadius: "50%",
          width: 38,
          height: 38,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: text.trim() && !loading ? "pointer" : "default",
          flexShrink: 0,
          transition: "all 0.15s ease"
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: "rotate(45deg) translate(-2px, 2px)" }}>
          <line x1="22" y1="2" x2="11" y2="13" />
          <polygon points="22 2 15 22 11 13 2 9 22 2" />
        </svg>
      </button>
    </form>
  );
}
