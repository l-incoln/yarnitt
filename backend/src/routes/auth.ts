import { Router } from "express";
import rateLimit from "express-rate-limit";
import { register } from "../controllers/auth";

const router = Router();

// Rate limiting for registration endpoint
// Limit to 5 registration attempts per 15 minutes per IP
// Can be disabled in test environments by setting DISABLE_RATE_LIMIT=true
const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: "Too many registration attempts, please try again later",
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skip: () => process.env.DISABLE_RATE_LIMIT === "true", // Skip rate limiting in tests
});

// POST /auth/register
router.post("/register", registerLimiter, register);

export default router;
