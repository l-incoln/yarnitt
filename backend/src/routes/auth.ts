import { Router } from "express";
import { register } from "../controllers/auth";

const router = Router();

// POST /auth/register - Register a new user
// TODO: Add rate limiting middleware to prevent abuse
// Example: import rateLimit from 'express-rate-limit';
// const registerLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 5 });
// router.post("/register", registerLimiter, register);
router.post("/register", register);

export default router;
