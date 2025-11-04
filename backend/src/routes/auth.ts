import { Router } from "express";
import { register } from "../controllers/auth";

const router = Router();

// TODO: Add rate limiting middleware to prevent brute force attacks
// Example: npm install express-rate-limit and apply it to these routes
router.post("/register", register);

export default router;
