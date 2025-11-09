import { Request, Response, NextFunction } from "express";
import User from "../models/User";

// Import at runtime to avoid TS import mismatch if utils/jwt exports differ
const { verifyAccessToken } = require("../utils/jwt") as {
  verifyAccessToken?: (token: string) => unknown;
};

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).send({ error: "Missing authorization" });

    const token = authHeader.split(" ")[1];
    const payload = verifyAccessToken ? verifyAccessToken(token) : null;

    if (!payload || typeof payload !== "object") return res.status(401).send({ error: "Invalid token" });

    // Narrow payload safely; prefer explicit properties if available
    // @ts-expect-error runtime payload shape
    const userId = (payload as any).sub ?? (payload as any).userId;
    if (!userId) return res.status(401).send({ error: "Invalid token payload" });

    const user = await User.findById(userId);
    if (!user) return res.status(401).send({ error: "User not found" });

    (req as any).user = user;
    return next();
  } catch (err) {
    return res.status(401).send({ error: "Unauthorized" });
  }
}
