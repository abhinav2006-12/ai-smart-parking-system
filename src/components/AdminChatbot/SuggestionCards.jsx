const ADMIN_SUGGESTIONS = [
  { text: "Free slots", query: "How many parking slots are available?" },
  { text: "Today's bookings", query: "Show today's bookings." },
  { text: "Weekly revenue", query: "How much revenue was generated this week?" },
  { text: "Active admins", query: "List all active users." },
  { text: "Cancelled sessions", query: "Show cancelled bookings" },
  { text: "EV occupancy", query: "How many EV slots are occupied?" },
  { text: "Peak hours", query: "What are today's peak parking hours?" },
];

export default function SuggestionCards({ onSelect, loading }) {
  return (
    <div
      className="suggestions-container"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        padding: "16px 20px",
        background: "var(--surface)",
        borderBottom: "1px solid var(--border)"
      }}
    >
      <div 
        style={{ 
          fontSize: 12, 
          fontWeight: 600, 
          color: "var(--muted)", 
          textTransform: "uppercase", 
          letterSpacing: "0.05em" 
        }}
      >
        Suggested Queries
      </div>
      <div
        className="suggestions-list"
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8
        }}
      >
        {ADMIN_SUGGESTIONS.map((item, index) => (
          <button
            key={index}
            disabled={loading}
            onClick={() => onSelect(item.query)}
            className="suggestion-chip"
            style={{
              background: "var(--surface-muted)",
              color: "var(--ink)",
              border: "1px solid var(--border)",
              borderRadius: 16,
              padding: "8px 12px",
              fontSize: 13,
              fontWeight: 500,
              cursor: loading ? "default" : "pointer",
              transition: "all 0.15s ease",
              textAlign: "left"
            }}
          >
            {item.text}
          </button>
        ))}
      </div>
      
      {/* Inline styles for suggestion chip hover */}
      <style>{`
        .suggestion-chip:hover {
          background: var(--accent-soft) !important;
          color: var(--accent) !important;
          border-color: var(--accent) !important;
          transform: translateY(-1px);
        }
        .suggestion-chip:active {
          transform: translateY(0);
        }
      `}</style>
    </div>
  );
}
