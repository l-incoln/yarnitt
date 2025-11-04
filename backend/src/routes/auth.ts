import { Router } from "express";
import rateLimit from "express-rate-limit";
import { register } from "../controllers/auth";

const router = Router();

// Rate limiter for registration: max 5 requests per 15 minutes per IP
const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: "Too many registration attempts, please try again later",
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// POST /auth/register - Register a new user
router.post("/register", registerLimiter, register);

export default router;
