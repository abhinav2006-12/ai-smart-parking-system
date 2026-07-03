import rateLimit from "express-rate-limit";

// Rate limit chatbot requests to 60 requests per 15 minutes
export const chatRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 60, // Limit each IP to 60 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: {
    error: "Too many requests to the AI Assistant. Please try again after 15 minutes."
  }
});
