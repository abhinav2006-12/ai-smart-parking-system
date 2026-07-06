import { useState } from "react";

// Helper to parse simple markdown to HTML safely
function parseMarkdown(text) {
  if (!text) return "";

  // 1. Escape HTML tags to prevent XSS (allowing only safe formatting)
  let escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // 2. Headings
  escaped = escaped.replace(/^### (.*?)$/gm, "<h3>$1</h3>");
  escaped = escaped.replace(/^## (.*?)$/gm, "<h2>$1</h2>");
  escaped = escaped.replace(/^# (.*?)$/gm, "<h1>$1</h1>");

  // 3. Bold & Italics
  escaped = escaped.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  escaped = escaped.replace(/\*(.*?)\*/g, "<em>$1</em>");
  escaped = escaped.replace(/__(.*?)__/g, "<strong>$1</strong>");
  escaped = escaped.replace(/_(.*?)_/g, "<em>$1</em>");

  // 4. Code Blocks
  escaped = escaped.replace(/```(\w*)\n([\s\S]*?)```/g, "<pre class='code-block'><code>$2</code></pre>");
  escaped = escaped.replace(/`(.*?)`/g, "<code class='inline-code'>$1</code>");

  // 5. Split by double newlines into blocks (paragraphs, lists, tables)
  const lines = escaped.split("\n");
  const processedBlocks = [];
  let currentList = [];
  let currentTable = [];

  const flushList = () => {
    if (currentList.length > 0) {
      processedBlocks.push(`<ul>${currentList.join("")}</ul>`);
      currentList = [];
    }
  };

  const flushTable = () => {
    if (currentTable.length > 0) {
      const headers = currentTable[0];
      const rows = currentTable.slice(1);
      
      let tableHtml = `<div class="table-container"><table>`;
      tableHtml += `<thead><tr>${headers.map(h => `<th>${h}</th>`).join("")}</tr></thead>`;
      tableHtml += `<tbody>`;
      rows.forEach(row => {
        tableHtml += `<tr>${row.map(cell => `<td>${cell}</td>`).join("")}</tr>`;
      });
      tableHtml += `</tbody></table></div>`;
      
      processedBlocks.push(tableHtml);
      currentTable = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Check if line is part of a Markdown table (starts and ends with |)
    if (line.startsWith("|") && line.endsWith("|")) {
      flushList();
      // Skip separator row (e.g. |---|---|)
      if (line.includes("---")) continue;
      
      const cells = line.split("|").map(c => c.trim()).filter((_, index, arr) => index > 0 && index < arr.length - 1);
      currentTable.push(cells);
      continue;
    } else {
      flushTable();
    }

    // Check if line is bullet point
    if (line.startsWith("- ") || line.startsWith("* ")) {
      currentList.push(`<li>${line.slice(2)}</li>`);
    } else if (line.match(/^\d+\.\s/)) {
      // Ordered list
      const content = line.replace(/^\d+\.\s/, "");
      currentList.push(`<li>${content}</li>`);
    } else {
      flushList();
      if (line) {
        // Wrap normal paragraphs, skipping block headers/pre structures already wrapped
        if (line.startsWith("<h") || line.startsWith("<pre") || line.startsWith("<code")) {
          processedBlocks.push(line);
        } else {
          processedBlocks.push(`<p>${line}</p>`);
        }
      }
    }
  }

  // Final flushes
  flushList();
  flushTable();

  return processedBlocks.join("");
}

export default function ChatMessage({ message, adminName }) {
  const isBot = message.role === "assistant";
  const [copied, setCopied] = useState(false);

  const formattedTime = new Date(message.timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit"
  });

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={`chat-message-row ${isBot ? "bot-row" : "user-row"}`}
      style={{
        display: "flex",
        justifyContent: isBot ? "flex-start" : "flex-end",
        gap: 12,
        marginBottom: 16,
        padding: "0 4px"
      }}
    >
      {/* Bot Avatar (Left) */}
      {isBot && (
        <div
          className="chat-avatar bot-avatar"
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            background: "linear-gradient(135deg, var(--accent) 0%, #3B5F75 100%)",
            color: "#FFF",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 13,
            fontWeight: 700,
            flexShrink: 0,
            border: "1px solid var(--border)"
          }}
        >
          AI
        </div>
      )}

      {/* Message Bubble Container */}
      <div style={{ display: "flex", flexDirection: "column", maxWidth: "80%" }}>
        {/* Bubble */}
        <div
          className={`chat-bubble ${isBot ? "bot-bubble" : "user-bubble"}`}
          style={{
            padding: "12px 16px",
            borderRadius: isBot ? "0px 14px 14px 14px" : "14px 14px 0px 14px",
            background: isBot 
              ? "var(--surface-muted)" 
              : "linear-gradient(135deg, var(--accent) 0%, var(--accent-hover) 100%)",
            color: isBot ? "var(--ink)" : "#FFFFFF",
            border: isBot ? "1px solid var(--border)" : "none",
            fontSize: 14.5,
            lineHeight: 1.5,
            position: "relative"
          }}
        >
          {/* Render Markdown parsed HTML */}
          <div 
            className="markdown-content"
            dangerouslySetInnerHTML={{ __html: parseMarkdown(message.content) }} 
          />

          {/* Copy Button for Bot Messages */}
          {isBot && !message.content.includes("⚠️ Error") && (
            <button
              onClick={handleCopy}
              className="chat-copy-btn"
              style={{
                position: "absolute",
                right: 8,
                bottom: 8,
                background: "transparent",
                border: "none",
                color: "var(--muted)",
                cursor: "pointer",
                padding: 4,
                display: "flex",
                alignItems: "center",
                gap: 4,
                fontSize: 11,
                borderRadius: 4,
                transition: "all 0.15s ease"
              }}
              title="Copy response"
            >
              {copied ? (
                <span style={{ color: "var(--success)" }}>Copied</span>
              ) : (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
              )}
            </button>
          )}
        </div>

        {/* Timestamp */}
        <span
          className="chat-time"
          style={{
            fontSize: 10.5,
            color: "var(--muted)",
            marginTop: 4,
            alignSelf: isBot ? "flex-start" : "flex-end",
            padding: "0 2px"
          }}
        >
          {isBot ? "ParkPilot AI" : adminName} &bull; {formattedTime}
        </span>
      </div>

      {/* User Avatar (Right) */}
      {!isBot && (
        <div
          className="chat-avatar user-avatar"
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            background: "var(--accent-soft)",
            color: "var(--accent)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 12,
            fontWeight: 700,
            flexShrink: 0,
            border: "1px solid var(--border)",
            textTransform: "uppercase"
          }}
        >
          {adminName.slice(0, 2)}
        </div>
      )}
    </div>
  );
}
