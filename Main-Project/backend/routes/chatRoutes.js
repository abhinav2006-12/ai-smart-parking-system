import { Router } from "express";
import { chatController } from "../controllers/chatController.js";
import { authenticateAdmin } from "../middleware/auth.js";
import { chatRateLimiter } from "../middleware/rateLimiter.js";

const router = Router();

// Apply auth middleware and rate limiting to the chat endpoint
router.post("/chat", authenticateAdmin, chatRateLimiter, chatController.handleChat);

export default router;
