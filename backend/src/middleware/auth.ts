import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../utils/jwt";
import User from "../models/User";

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ message: "missing auth token" });
  }

  const token = header.split(" ")[1];
  try {
    const payload = verifyAccessToken(token);
    const user = await User.findById((payload as any).sub);
    if (!user) {
      return res.status(401).json({ message: "user not found" });
    }
    (req as any).user = user;
    next();
  } catch (err) {
    return res.status(401).json({ message: "invalid token" });
  }
}

export function requireRole(required: "buyer" | "seller" | "admin") {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ message: "not authenticated" });
    }
    if (user.role !== required && user.role !== "admin") {
      return res.status(403).json({ message: "insufficient role" });
    }
    next();
  };
}
