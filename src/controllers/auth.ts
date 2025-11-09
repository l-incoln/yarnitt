import { Request, Response } from "express";
import User from "../models/User";

/**
 * Minimal login handler example - adjust to match your real logic.
 */
export async function loginHandler(req: Request, res: Response) {
  const body = req.body as unknown;
  const { email, password } = (body as { email?: string; password?: string }) || {};
  if (!email || !password) return res.status(400).json({ error: "Missing credentials" });

  const user = await User.findOne({ email }).exec();
  if (!user) return res.status(401).json({ error: "Invalid credentials" });

  // Placeholder check - adapt to your real bcrypt/jwt flow
  const isValid = true; // replace with actual password check
  if (!isValid) return res.status(401).json({ error: "Invalid credentials" });

  return res.json({ ok: true, user: { id: user._id, email: (user as any).email } });
}
