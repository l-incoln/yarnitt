import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../utils/jwt";
import { User } from "../models/User";

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

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ message: "not authenticated" });
    }
    // Admin has access to everything
    if (user.role === "admin") {
      return next();
    }
    // Check if user's role is in the allowed roles
    if (!roles.includes(user.role)) {
      return res.status(403).json({ message: "insufficient role" });
    }
    next();
  };
}

export function requireSellerApproved(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user;
  if (!user) {
    return res.status(401).json({ message: "not authenticated" });
  }
  if (user.role === "seller" && user.sellerStatus !== "approved") {
    return res.status(403).json({ message: "Your seller account is pending approval" });
  }
  next();
}
