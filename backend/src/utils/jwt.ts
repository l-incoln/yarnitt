import jwt from "jsonwebtoken"; import { IUser } from "../models/User";

const JWT_SECRET = process.env.JWT_SECRET || "please_set_JWT_SECRET"; const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "please_set_JWT_REFRESH_SECRET"; const ACCESS_EXPIRES = process.env.JWT_ACCESS_EXPIRES || "15m"; const REFRESH_EXPIRES = process.env.JWT_REFRESH_EXPIRES || "30d";

export function signAccessToken(user: IUser) { const payload = { sub: user.id, role: user.role }; return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_EXPIRES }); }

export function signRefreshToken(user: IUser) { const payload = { sub: user.id }; return jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: REFRESH_EXPIRES }); }

export function verifyAccessToken(token: string) { return jwt.verify(token, JWT_SECRET) as { sub: string; role?: string; iat?: number; exp?: number }; }

export function verifyRefreshToken(token: string) { return jwt.verify(token, JWT_REFRESH_SECRET) as { sub: string; iat?: number; exp?: number }; }
