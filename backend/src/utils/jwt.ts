import jwt, { SignOptions } from "jsonwebtoken";

const JWT_SECRET: string = process.env.JWT_SECRET || "default-secret-change-in-production";
const ACCESS_TOKEN_TTL = (process.env.ACCESS_TOKEN_TTL || "15m") as string;
const REFRESH_TOKEN_TTL = (process.env.REFRESH_TOKEN_TTL || "7d") as string;

export interface TokenPayload {
  userId: string;
  email: string;
  [key: string]: any;
}

/**
 * Sign an access token (short-lived, default 15 minutes)
 */
export function signAccessToken(payload: TokenPayload): string {
  const options: SignOptions = { expiresIn: ACCESS_TOKEN_TTL as any };
  return jwt.sign(payload, JWT_SECRET, options);
}

/**
 * Sign a refresh token (longer-lived, default 7 days)
 */
export function signRefreshToken(payload: TokenPayload): string {
  const options: SignOptions = { expiresIn: REFRESH_TOKEN_TTL as any };
  return jwt.sign(payload, JWT_SECRET, options);
}

/**
 * Verify and decode a token
 */
export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch (error) {
    return null;
  }
}
