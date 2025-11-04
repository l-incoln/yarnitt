import express from "express"; import { registerBuyer, registerSeller, login, logout, refresh, forgotPassword, resetPassword, me, verifyEmail, } from "../controllers/auth"; import { requireAuth } from "../middleware/auth";

const router = express.Router();

router.post("/register", registerBuyer); router.post("/register-seller", registerSeller); router.get("/verify-email", verifyEmail); router.post("/login", login); router.post("/logout", logout); router.post("/refresh", refresh); router.post("/forgot-password", forgotPassword); router.post("/reset-password", resetPassword); router.get("/me", requireAuth, me);

export default router; 
