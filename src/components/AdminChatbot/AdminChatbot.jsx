import { useContext } from "react";
import { ChatbotContext } from "../../context/ChatbotContext";
import ChatWindow from "./ChatWindow";

export default function AdminChatbot({ adminUser }) {
  const { isOpen, setIsOpen, messages } = useContext(ChatbotContext);

  if (!adminUser) return null;

  return (
    <>
      {/* Floating Trigger Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="admin-chatbot-trigger"
          style={{
            position: "fixed",
            right: 24,
            bottom: 24,
            width: 54,
            height: 54,
            borderRadius: "50%",
            background: "linear-gradient(135deg, var(--accent) 0%, var(--accent-hover) 100%)",
            color: "#FFFFFF",
            border: "none",
            boxShadow: "0 4px 16px rgba(0, 0, 0, 0.2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            zIndex: 999,
            transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)"
          }}
          title="Open ParkPilot AI Copilot"
        >
          {/* Custom Robot SVG Icon */}
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 8V4H8" />
            <rect x="5" y="8" width="14" height="12" rx="2" ry="2" />
            <path d="M9 11h.01" />
            <path d="M15 11h.01" />
            <path d="M10 16h4" />
          </svg>

          {/* Indicator dot if chat has active messages */}
          {messages.length > 0 && (
            <div
              style={{
                position: "absolute",
                top: -2,
                right: -2,
                width: 12,
                height: 12,
                borderRadius: "50%",
                background: "var(--danger)",
                border: "2px solid var(--surface)",
                animation: "pulse-danger 2s infinite"
              }}
            />
          )}
        </button>
      )}

      {/* Expandable Chat Window */}
      {isOpen && (
        <ChatWindow adminUser={adminUser} onClose={() => setIsOpen(false)} />
      )}

      {/* Inline styles for trigger animations and states */}
      <style>{`
        .admin-chatbot-trigger:hover {
          transform: scale(1.08);
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.25);
        }
        .admin-chatbot-trigger:active {
          transform: scale(0.95);
        }
        @keyframes pulse-danger {
          0% {
            box-shadow: 0 0 0 0 rgba(226, 104, 90, 0.7);
          }
          70% {
            box-shadow: 0 0 0 6px rgba(226, 104, 90, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(226, 104, 90, 0);
          }
        }
      `}</style>
    </>
  );
}
