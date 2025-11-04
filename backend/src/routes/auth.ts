import { Router } from "express";
import { register } from "../controllers/auth";

const router = Router();

// POST /auth/register - Register a new user
router.post("/register", register);

export default router;
