import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

// Ensure JWT_SECRET is set, especially in production
if (!process.env.JWT_SECRET && process.env.NODE_ENV === "production") {
  throw new Error("JWT_SECRET must be set in production environment");
}

const JWT_SECRET = process.env.JWT_SECRET || "default-secret-key-change-in-production";
const JWT_ACCESS_TTL = process.env.JWT_ACCESS_TTL || "15m";
const JWT_REFRESH_TTL = process.env.JWT_REFRESH_TTL || "7d";

export interface TokenPayload {
  sub: string; // userId
  email: string;
}

export function signAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_ACCESS_TTL,
  } as jwt.SignOptions);
}

export function signRefreshToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_REFRESH_TTL,
  } as jwt.SignOptions);
}
