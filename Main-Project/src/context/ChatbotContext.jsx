import { createContext, useState, useEffect, useCallback, useRef } from "react";

export const ChatbotContext = createContext(null);

const STORAGE_KEY = "parkpilot_admin_chat_history";
const ACTIVE_SESSION_KEY = "parkpilot_admin_chat_active_session";

export function ChatbotProvider({ children, adminUser }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Chat History: array of { id, title, messages: [] }
  const [chatHistory, setChatHistory] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [activeSessionId, setActiveSessionId] = useState(() => {
    return localStorage.getItem(ACTIVE_SESSION_KEY) || null;
  });

  // Voice recording state
  const [isListening, setIsListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const recognitionRef = useRef(null);

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      setVoiceSupported(true);
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = "en-IN"; // Set locale to Indian English

      rec.onstart = () => setIsListening(true);
      rec.onend = () => setIsListening(false);
      rec.onerror = (e) => {
        console.error("Speech recognition error:", e);
        setIsListening(false);
      };

      recognitionRef.current = rec;
    }
  }, []);

  // Save history to localStorage on change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(chatHistory));
  }, [chatHistory]);

  // Save active session ID on change
  useEffect(() => {
    if (activeSessionId) {
      localStorage.setItem(ACTIVE_SESSION_KEY, activeSessionId);
    } else {
      localStorage.removeItem(ACTIVE_SESSION_KEY);
    }
  }, [activeSessionId]);

  // Load the active session's messages
  useEffect(() => {
    if (activeSessionId) {
      const session = chatHistory.find((s) => s.id === activeSessionId);
      if (session) {
        setMessages(session.messages);
        return;
      }
    }
    setMessages([]);
  }, [activeSessionId, chatHistory]);

  // Reset chat if the admin logs out
  useEffect(() => {
    if (!adminUser) {
      setMessages([]);
      setActiveSessionId(null);
      setIsOpen(false);
    }
  }, [adminUser]);

  // Start new chat session
  const createNewSession = useCallback((firstMsgText = "") => {
    const newId = `session_${Date.now()}`;
    const newSession = {
      id: newId,
      title: firstMsgText ? (firstMsgText.slice(0, 24) + (firstMsgText.length > 24 ? "..." : "")) : "New Chat",
      messages: [],
      timestamp: Date.now(),
    };
    setChatHistory((prev) => [newSession, ...prev]);
    setActiveSessionId(newId);
    return newId;
  }, []);

  // Send message to Express backend
  const sendMessage = useCallback(async (text) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    setError(null);
    setLoading(true);

    const userMsg = {
      id: `msg_${Date.now()}`,
      role: "user",
      content: trimmed,
      timestamp: Date.now()
    };

    let sessionId = activeSessionId;
    if (!sessionId) {
      sessionId = createNewSession(trimmed);
    }

    // Immediately append user message to local state for visual speed
    setMessages((prev) => [...prev, userMsg]);

    // Update session title if it was default
    setChatHistory((prev) =>
      prev.map((s) => {
        if (s.id === sessionId) {
          const updatedMsgs = [...s.messages, userMsg];
          const title = s.title === "New Chat" 
            ? (trimmed.slice(0, 24) + (trimmed.length > 24 ? "..." : "")) 
            : s.title;
          return { ...s, title, messages: updatedMsgs };
        }
        return s;
      })
    );

    try {
      // Get JWT from localStorage
      const token = localStorage.getItem("parkpilot_admin_token");
      
      const sessionMessages = [
        ...messages,
        userMsg
      ].map(m => ({ role: m.role, content: m.content }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          messages: sessionMessages
        })
      });

      if (!res.ok) {
        if (res.status === 429) {
          throw new Error("You are sending too many requests. Please slow down.");
        }
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Server responded with status ${res.status}`);
      }

      const data = await res.json();
      const aiReplyText = data.content?.find((c) => c.type === "text")?.text || "Sorry, I received an invalid reply structure.";

      const aiMsg = {
        id: `msg_${Date.now() + 1}`,
        role: "assistant",
        content: aiReplyText,
        timestamp: Date.now()
      };

      setMessages((prev) => [...prev, aiMsg]);

      // Update session history
      setChatHistory((prev) =>
        prev.map((s) => {
          if (s.id === sessionId) {
            return { ...s, messages: [...s.messages, aiMsg] };
          }
          return s;
        })
      );

    } catch (err) {
      console.error("[ChatbotContext] Send failed:", err);
      setError(err.message || "Network error. Failed to reach assistant.");
      
      const errResponse = {
        id: `msg_${Date.now() + 1}`,
        role: "assistant",
        content: `⚠️ **Error**: ${err.message || "Failed to communicate with the server. Please check your network connection."}`,
        timestamp: Date.now()
      };
      
      setMessages((prev) => [...prev, errResponse]);
    } finally {
      setLoading(false);
    }
  }, [activeSessionId, messages, loading, createNewSession]);

  // Clear chat
  const clearChat = useCallback(() => {
    if (activeSessionId) {
      setChatHistory((prev) => prev.filter((s) => s.id !== activeSessionId));
      setActiveSessionId(null);
    }
    setMessages([]);
    setError(null);
    setLoading(false);
  }, [activeSessionId]);

  // Load specific chat session
  const loadSession = useCallback((id) => {
    setActiveSessionId(id);
    setError(null);
  }, []);

  // Delete specific session
  const deleteSession = useCallback((id, e) => {
    if (e) e.stopPropagation();
    setChatHistory((prev) => prev.filter((s) => s.id !== id));
    if (activeSessionId === id) {
      setActiveSessionId(null);
      setMessages([]);
    }
  }, [activeSessionId]);

  // Speech Recognition triggers
  const startListening = useCallback(() => {
    if (recognitionRef.current && !isListening) {
      try {
        recognitionRef.current.onresult = (event) => {
          const resultText = event.results[0][0].transcript;
          if (resultText) {
            sendMessage(resultText);
          }
        };
        recognitionRef.current.start();
      } catch (err) {
        console.error(err);
      }
    }
  }, [isListening, sendMessage]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  }, [isListening]);

  return (
    <ChatbotContext.Provider
      value={{
        isOpen,
        setIsOpen,
        messages,
        loading,
        error,
        chatHistory,
        activeSessionId,
        sendMessage,
        clearChat,
        createNewSession: () => createNewSession(""),
        loadSession,
        deleteSession,
        voiceSupported,
        isListening,
        startListening,
        stopListening
      }}
    >
      {children}
    </ChatbotContext.Provider>
  );
}
