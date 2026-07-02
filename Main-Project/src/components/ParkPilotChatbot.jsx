import { useState, useRef, useEffect, useCallback } from "react";

// ─── System prompt (exactly as authored by the ParkPilot team) ──────────────
const SYSTEM_PROMPT = `You are ParkPilot Assistant, a friendly AI chatbot that helps users understand and use the ParkPilot Smart Parking System.

Your Role
Help users by answering questions about:
- How ParkPilot works
- Vehicle Check-In process
- Vehicle Check-Out process
- Parking fee calculation
- UPI payment
- Vehicle types (Standard, EV, Disabled)
- Parking slot availability
- Admin features (general explanation only)
- Camera and number plate scanning
- Common troubleshooting
- General FAQs

Response Style
- Use simple English.
- Keep answers under 120 words unless the user asks for more detail.
- Be polite and professional.
- Explain step by step when needed.
- Never use technical jargon unless the user specifically asks.
- If the user greets you, greet them back naturally.

Project Knowledge
ParkPilot is an AI-powered smart parking management system.
Features include:
- Automatic number plate recognition using a camera.
- Vehicle Check-In.
- Vehicle Check-Out.
- Parking fee calculation based on parking duration.
- UPI QR code generation for payments.
- Admin dashboard for monitoring vehicles, occupancy, revenue, and parking settings.
- Data is stored securely in Supabase.

Parking Flow:
1. User selects Check-In.
2. Camera scans the vehicle number plate.
3. Vehicle details are saved.
4. During Check-Out, the plate is scanned again.
5. Parking duration and fee are calculated.
6. A UPI QR code is generated.
7. After payment confirmation, the vehicle exits.

FAQs
Q: How do I check in my vehicle? A: Select Check-In, choose your vehicle type, scan your number plate, and the system will save your parking record automatically.
Q: How do I check out? A: Select Check-Out, scan the same number plate, pay the displayed fee using the generated UPI QR code, and confirm payment.
Q: How is the parking fee calculated? A: The fee is calculated based on the parking duration and the hourly rate configured by the parking administrator.
Q: What if my number plate isn't detected? A: You can manually enter or upload the vehicle number if automatic detection fails.
Q: Is my information secure? A: Vehicle information is stored securely in the system database and is only used for parking management.
Q: Can I reserve a parking slot? A: Currently, ParkPilot supports live parking management only and does not provide advance reservations.
Q: Can I edit my parking record? A: Parking records are managed by the parking staff or administrator.

Safety Rules
- Never invent parking fees or slot availability.
- If live information is unavailable, clearly state that you cannot access real-time parking data.
- Never reveal admin credentials, API keys, database information, or internal system details.
- Never fabricate information.
- If you do not know an answer, politely say so and recommend contacting the parking administrator.

Closing Style
End responses naturally, for example:
- "Let me know if you have any other questions."
- "I'm happy to help with anything about ParkPilot."
- "Feel free to ask if you need more assistance."`;

// ─── Quick-reply suggestions shown before first message ──────────────────────
const SUGGESTIONS = [
  "How do I check in my vehicle?",
  "How is the fee calculated?",
  "What if my plate isn't detected?",
  "What vehicle types are supported?",
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
function BotIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="10" rx="2" />
      <path d="M12 11V7" />
      <circle cx="12" cy="5" r="2" />
      <path d="M8 15h.01M12 15h.01M16 15h.01" strokeWidth="2.5" />
    </svg>
  );
}
function SendIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z" />
    </svg>
  );
}
function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}

// ─── Local offline FAQ matching responder ────────────────────────────────────
function getLocalResponse(userMessage) {
  const query = userMessage.toLowerCase().trim();
  
  if (query.includes("check in") || query.includes("check-in") || query.includes("checkin") || query.includes("enter") || query.includes("entry")) {
    return "To check in your vehicle:\n1. Select the **Check-In** button on the main screen.\n2. Choose your vehicle type (Standard, EV, or Disabled).\n3. Scan your number plate using the camera (or enter it manually if scanning fails).\n4. The system will save your record and assign you a slot.";
  }
  
  if (query.includes("check out") || query.includes("check-out") || query.includes("checkout") || query.includes("exit") || query.includes("pay")) {
    return "To check out and exit:\n1. Select the **Check-Out** button on the main screen.\n2. Scan your number plate (or type it in manually).\n3. The system will calculate your parking duration and fee.\n4. Scan the generated UPI QR code to make your payment.\n5. Once payment is confirmed, the check-out is complete and the gate opens.";
  }
  
  if (query.includes("fee") || query.includes("calculate") || query.includes("rate") || query.includes("price") || query.includes("cost") || query.includes("money") || query.includes("charging")) {
    return "Parking fees are calculated based on your vehicle type and the total duration parked. The hourly rates are configured by the administrator in the **Admin Panel** settings.";
  }
  
  if (query.includes("detect") || query.includes("plate") || query.includes("scan") || query.includes("camera") || query.includes("recogni")) {
    return "If automatic number plate detection fails, don't worry! Attendants and guests can manually type in the vehicle number plate or upload a photo to proceed with check-in or check-out.";
  }
  
  if (query.includes("secure") || query.includes("privacy") || query.includes("data") || query.includes("safe") || query.includes("supabase")) {
    return "Yes, all vehicle records and entry/exit timestamps are stored securely in our database and are used solely for managing the parking facility's live occupancy and logs.";
  }
  
  if (query.includes("reserve") || query.includes("reservation") || query.includes("book")) {
    return "ParkPilot currently manages live parking slot occupancy and does not support advance reservations. Slots are available on a first-come, first-served basis.";
  }
  
  if (query.includes("edit") || query.includes("record") || query.includes("change") || query.includes("delete")) {
    return "Parking records are managed by the gate manager or administrator. Attendants with administrator credentials can manage active vehicles and configurations in the **Admin Panel**.";
  }
  
  if (query.includes("vehicle") || query.includes("type") || query.includes("ev") || query.includes("disabled") || query.includes("accessible")) {
    return "ParkPilot supports three vehicle categories:\n- **Standard**: Regular fuel/gas cars.\n- **EV**: Electric Vehicles with access to dedicated charging indicators.\n- **Disabled**: Dedicated spaces for accessible parking.";
  }

  if (query.includes("hi") || query.includes("hello") || query.includes("hey") || query.includes("greet")) {
    return "Hello! I'm your ParkPilot Assistant. How can I help you with the smart parking system today?";
  }

  return "I'm currently running in local offline assistant mode. I can help you with common questions about:\n- Check-In & Check-Out process\n- Parking fee calculations & rates\n- Number plate scanning / manual entry\n- Supported vehicle types (Standard, EV, Disabled)\n- Admin settings & logs\n\nTry asking a question containing some of these keywords!";
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function ParkPilotChatbot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]); // { role: "user"|"assistant", content: string }
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  // Unread badge: counts assistant replies received while panel is closed
  const [unread, setUnread] = useState(0);

  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const abortRef = useRef(null);

  // Scroll to latest message whenever messages change or panel opens
  useEffect(() => {
    if (open && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, open, loading]);

  // Focus input when panel opens
  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [open]);

  // Count unread when panel is closed and assistant replies
  useEffect(() => {
    if (!open && messages.length > 0 && messages.at(-1).role === "assistant") {
      setUnread((n) => n + 1);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  const handleOpen = () => {
    setOpen(true);
    setUnread(0);
  };

  const sendMessage = useCallback(async (text) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    setError(null);
    const userMsg = { role: "user", content: trimmed };
    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);
    setInput("");
    setLoading(true);

    // Cancel any previous in-flight request
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/chatbot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 1000,
          system: SYSTEM_PROMPT,
          messages: nextHistory.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (!res.ok) {
        throw new Error(`Request failed (${res.status})`);
      }

      const data = await res.json();
      
      if (data?.error?.type === "unconfigured") {
        console.warn("[Chatbot] Server has no Anthropic API key. Using local FAQ fallback responder.");
        const fallbackReply = getLocalResponse(trimmed);
        setMessages((prev) => [...prev, { role: "assistant", content: fallbackReply }]);
      } else if (data?.error) {
        throw new Error(data.error.message || "Unknown proxy error.");
      } else {
        const reply = data.content?.find((b) => b.type === "text")?.text || "Sorry, I couldn't generate a response.";
        setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
      }
    } catch (err) {
      if (err.name === "AbortError") return;
      console.warn("[Chatbot] Using local fallback response. Error info:", err);
      const fallbackReply = getLocalResponse(trimmed);
      setMessages((prev) => [...prev, { role: "assistant", content: fallbackReply }]);
    } finally {
      setLoading(false);
    }
  }, [messages, loading]);

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleSuggestion = (text) => {
    sendMessage(text);
  };

  // ── Styles (inline, respecting the app's CSS variables) ───────────────────
  const fabStyle = {
    position: "fixed",
    bottom: 28,
    right: 28,
    zIndex: 9999,
    width: 52,
    height: 52,
    borderRadius: "50%",
    background: "linear-gradient(135deg, var(--accent), var(--accent-hover))",
    color: "#fff",
    border: "none",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 4px 20px rgba(0,0,0,0.22)",
    transition: "transform 0.15s ease, box-shadow 0.15s ease",
  };

  const panelStyle = {
    position: "fixed",
    bottom: 92,
    right: 28,
    zIndex: 9998,
    width: "min(380px, calc(100vw - 40px))",
    height: "min(520px, calc(100vh - 120px))",
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: 16,
    boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    // Animate open/close
    opacity: open ? 1 : 0,
    transform: open ? "scale(1) translateY(0)" : "scale(0.92) translateY(12px)",
    pointerEvents: open ? "auto" : "none",
    transition: "opacity 0.2s ease, transform 0.2s ease",
    transformOrigin: "bottom right",
  };

  return (
    <>
      {/* ── Chat panel ──────────────────────────────────────────────────────── */}
      <div style={panelStyle} aria-hidden={!open}>

        {/* Header */}
        <div style={{
          padding: "14px 16px",
          background: "linear-gradient(135deg, var(--accent), var(--accent-hover))",
          display: "flex",
          alignItems: "center",
          gap: 10,
          flexShrink: 0,
        }}>
          <div style={{
            width: 34, height: 34, borderRadius: "50%",
            background: "rgba(255,255,255,0.15)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#fff", flexShrink: 0,
          }}>
            <BotIcon />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ color: "#fff", fontWeight: 700, fontSize: 14, lineHeight: 1.2 }}>ParkPilot Assistant</div>
            <div style={{ color: "rgba(255,255,255,0.75)", fontSize: 11.5, display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#4ade80", display: "inline-block" }} />
              Online — here to help
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            style={{
              background: "rgba(255,255,255,0.15)", border: "none", color: "#fff",
              cursor: "pointer", borderRadius: 8, width: 30, height: 30,
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "background 0.15s",
            }}
            aria-label="Close chat"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Messages area */}
        <div style={{
          flex: 1,
          overflowY: "auto",
          padding: "16px 14px",
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}>
          {/* Welcome state — no messages yet */}
          {messages.length === 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{
                background: "var(--surface-muted)",
                border: "1px solid var(--border)",
                borderRadius: 12,
                padding: "14px 16px",
                display: "flex",
                gap: 10,
                alignItems: "flex-start",
              }}>
                <div style={{
                  width: 28, height: 28, borderRadius: "50%",
                  background: "var(--accent-soft)", color: "var(--accent)",
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}>
                  <BotIcon />
                </div>
                <p style={{ fontSize: 13.5, color: "var(--ink)", lineHeight: 1.55, margin: 0 }}>
                  Hi! I'm the ParkPilot Assistant 👋<br />
                  Ask me anything about how to use the parking system — check-in, check-out, fees, payments, and more.
                </p>
              </div>

              {/* Quick-reply chips */}
              <div>
                <p style={{ fontSize: 11.5, color: "var(--muted)", fontWeight: 600, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Common questions
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => handleSuggestion(s)}
                      style={{
                        background: "var(--surface)",
                        border: "1px solid var(--border)",
                        borderRadius: 8,
                        padding: "9px 12px",
                        textAlign: "left",
                        cursor: "pointer",
                        fontSize: 13,
                        color: "var(--ink)",
                        fontWeight: 500,
                        transition: "border-color 0.15s, background 0.15s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = "var(--accent)";
                        e.currentTarget.style.background = "var(--accent-soft)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = "var(--border)";
                        e.currentTarget.style.background = "var(--surface)";
                      }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Conversation messages */}
          {messages.map((msg, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                flexDirection: msg.role === "user" ? "row-reverse" : "row",
                alignItems: "flex-end",
                gap: 8,
              }}
            >
              {/* Avatar for assistant only */}
              {msg.role === "assistant" && (
                <div style={{
                  width: 26, height: 26, borderRadius: "50%",
                  background: "var(--accent-soft)", color: "var(--accent)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0, marginBottom: 2,
                }}>
                  <BotIcon />
                </div>
              )}
              <div style={{
                maxWidth: "78%",
                padding: "10px 13px",
                borderRadius: msg.role === "user"
                  ? "14px 14px 4px 14px"
                  : "14px 14px 14px 4px",
                background: msg.role === "user"
                  ? "linear-gradient(135deg, var(--accent), var(--accent-hover))"
                  : "var(--surface-muted)",
                color: msg.role === "user" ? "#fff" : "var(--ink)",
                fontSize: 13.5,
                lineHeight: 1.55,
                border: msg.role === "user" ? "none" : "1px solid var(--border)",
                whiteSpace: "pre-wrap",
              }}>
                {msg.content}
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {loading && (
            <div style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
              <div style={{
                width: 26, height: 26, borderRadius: "50%",
                background: "var(--accent-soft)", color: "var(--accent)",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
              }}>
                <BotIcon />
              </div>
              <div style={{
                padding: "12px 16px",
                background: "var(--surface-muted)",
                border: "1px solid var(--border)",
                borderRadius: "14px 14px 14px 4px",
                display: "flex", gap: 5, alignItems: "center",
              }}>
                {[0, 1, 2].map((d) => (
                  <span key={d} style={{
                    width: 6, height: 6, borderRadius: "50%",
                    background: "var(--muted)",
                    display: "inline-block",
                    animation: "chatbotBounce 1.2s infinite ease-in-out",
                    animationDelay: `${d * 0.2}s`,
                  }} />
                ))}
              </div>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div style={{
              background: "var(--danger-soft)",
              border: "1px solid var(--danger)",
              borderRadius: 8,
              padding: "10px 12px",
              fontSize: 12.5,
              color: "var(--danger)",
            }}>
              {error}
            </div>
          )}

          {/* Invisible scroll anchor */}
          <div ref={bottomRef} />
        </div>

        {/* Input bar */}
        <div style={{
          padding: "12px 14px",
          borderTop: "1px solid var(--border)",
          background: "var(--surface)",
          flexShrink: 0,
        }}>
          <form onSubmit={handleSubmit} style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask me about ParkPilot…"
              disabled={loading}
              style={{
                flex: 1,
                padding: "10px 13px",
                borderRadius: 10,
                border: "1px solid var(--border)",
                background: "var(--surface-muted)",
                color: "var(--ink)",
                fontSize: 13.5,
                outline: "none",
                transition: "border-color 0.15s",
              }}
              onFocus={(e) => { e.target.style.borderColor = "var(--accent)"; }}
              onBlur={(e) => { e.target.style.borderColor = "var(--border)"; }}
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              style={{
                width: 38, height: 38, borderRadius: 10,
                background: input.trim() && !loading
                  ? "linear-gradient(135deg, var(--accent), var(--accent-hover))"
                  : "var(--surface-muted)",
                border: "1px solid var(--border)",
                color: input.trim() && !loading ? "#fff" : "var(--muted)",
                cursor: input.trim() && !loading ? "pointer" : "default",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
                transition: "background 0.15s, color 0.15s",
              }}
              aria-label="Send message"
            >
              <SendIcon />
            </button>
          </form>
          <p style={{ fontSize: 10.5, color: "var(--muted)", textAlign: "center", marginTop: 8 }}>
            ParkPilot Assistant · Powered by AI
          </p>
        </div>
      </div>

      {/* ── FAB button ──────────────────────────────────────────────────────── */}
      <button
        onClick={open ? () => setOpen(false) : handleOpen}
        style={fabStyle}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "scale(1.08)";
          e.currentTarget.style.boxShadow = "0 6px 24px rgba(0,0,0,0.28)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "scale(1)";
          e.currentTarget.style.boxShadow = "0 4px 20px rgba(0,0,0,0.22)";
        }}
        aria-label={open ? "Close assistant" : "Open ParkPilot Assistant"}
      >
        {open ? <CloseIcon /> : <BotIcon />}

        {/* Unread badge */}
        {!open && unread > 0 && (
          <span style={{
            position: "absolute",
            top: -4, right: -4,
            width: 18, height: 18,
            background: "#ef4444",
            color: "#fff",
            borderRadius: "50%",
            fontSize: 10,
            fontWeight: 700,
            display: "flex", alignItems: "center", justifyContent: "center",
            border: "2px solid var(--bg)",
          }}>
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {/* ── Bounce keyframe for typing dots ────────────────────────────────── */}
      <style>{`
        @keyframes chatbotBounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-5px); opacity: 1; }
        }
      `}</style>
    </>
  );
}
