import { Component } from "react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("[ErrorBoundary] Uncaught error:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "32px 20px",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          <div
            style={{
              maxWidth: 420,
              width: "100%",
              textAlign: "center",
              padding: "36px 28px",
              borderRadius: 16,
              background: "var(--surface, #fff)",
              boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
              border: "1px solid var(--border, #e5e7eb)",
            }}
          >
            {/* Error icon */}
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: "50%",
                background: "var(--danger-soft, #fef2f2)",
                color: "var(--danger, #e53935)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 18px",
                fontSize: 26,
              }}
            >
              ⚠
            </div>

            <h2
              style={{
                fontSize: 20,
                fontWeight: 700,
                margin: "0 0 8px",
                color: "var(--ink, #111)",
              }}
            >
              Something went wrong
            </h2>

            <p
              style={{
                fontSize: 13.5,
                color: "var(--muted, #6b7280)",
                margin: "0 0 20px",
                lineHeight: 1.6,
              }}
            >
              An unexpected error occurred. Your data is safe — please reload
              to continue.
            </p>

            {/* Show error detail in dev */}
            {this.state.error && (
              <div
                style={{
                  fontSize: 12,
                  background: "var(--surface-muted, #f3f4f6)",
                  border: "1px solid var(--border, #e5e7eb)",
                  borderRadius: 8,
                  padding: "10px 12px",
                  marginBottom: 20,
                  textAlign: "left",
                  color: "var(--danger, #e53935)",
                  fontFamily: "monospace",
                  wordBreak: "break-word",
                }}
              >
                {this.state.error.message}
              </div>
            )}

            <button
              onClick={() => window.location.reload()}
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: 10,
                border: "none",
                background: "var(--accent, #2563eb)",
                color: "#fff",
                fontWeight: 700,
                fontSize: 15,
                cursor: "pointer",
              }}
            >
              Reload App
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
