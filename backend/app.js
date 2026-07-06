import express from "express";
import cors from "cors";
import authRoutes from "./routes/authRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";

const app = express();

// Middleware
app.use(cors({
  origin: "*", // Adjust to specific domains in production if needed
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json());

// Routes
app.use("/api/admin", authRoutes);
app.use("/api", chatRoutes);

// General health check route
app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "healthy", timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("[Express App Error]:", err.stack);
  res.status(err.status || 500).json({
    error: err.message || "Internal server error occurred."
  });
});

export default app;
