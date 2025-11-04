import { Request, Response } from "express";
import User from "../models/User";
import RefreshToken from "../models/RefreshToken";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../utils/jwt";
import crypto from "crypto";
import ms from "ms";

const REFRESH_TOKEN_LIFETIME = process.env.JWT_REFRESH_EXPIRES || "30d";

function sendStubEmail(to: string, subject: string, body: string) {
  // Replace with real email sender (SendGrid / SES) in production.
  console.log(`SEND EMAIL to=${to} subject=${subject}\n${body}`);
}

export async function registerBuyer(req: Request, res: Response) {
  try {
    const { name, email, password, phone } = req.body;
    if (!email || !password) return res.status(400).json({ message: "email and password required" });

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) return res.status(409).json({ message: "email already in use" });

    const user = new User({
      name,
      email,
      phone,
      passwordHash: password,
      role: "buyer",
      verified: false,
    });
    await user.save();

    const token = crypto.randomBytes(20).toString("hex");
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24); // 24h
    await RefreshToken.create({ userId: user.id, token: `verify:${token}`, expiresAt });

    const verifyUrl = `${process.env.FRONTEND_URL || ""}/verify-email?token=${token}&uid=${user.id}`;
    sendStubEmail(user.email, "Verify your Yarnitt account", `Click to verify: ${verifyUrl}`);

    return res.status(201).json({ id: user.id, email: user.email });
  } catch (err) {
    console.error("registerBuyer error:", err);
    return res.status(500).json({ message: "internal server error" });
  }
}

export async function registerSeller(req: Request, res: Response) {
  try {
    const { name, email, password, phone, shopName } = req.body;
    if (!email || !password || !shopName)
      return res.status(400).json({ message: "email, password and shopName required" });

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) return res.status(409).json({ message: "email already in use" });

    const user = new User({
      name,
      email,
      phone,
      passwordHash: password,
      role: "seller",
      verified: false,
    });
    await user.save();

    // TODO: create SellerProfile model and link here. For now return pending status
    const token = crypto.randomBytes(20).toString("hex");
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24); // 24h
    await RefreshToken.create({ userId: user.id, token: `verify:${token}`, expiresAt });

    const verifyUrl = `${process.env.FRONTEND_URL || ""}/verify-email?token=${token}&uid=${user.id}`;
    sendStubEmail(user.email, "Verify your Yarnitt seller account", `Click to verify: ${verifyUrl}`);

    return res.status(201).json({ id: user.id, email: user.email, sellerStatus: "pending" });
  } catch (err) {
    console.error("registerSeller error:", err);
    return res.status(500).json({ message: "internal server error" });
  }
}

export async function verifyEmail(req: Request, res: Response) {
  try {
    const { token, uid } = req.query as any;
    if (!token || !uid) return res.status(400).json({ message: "token and uid required" });

    const rt = await RefreshToken.findOne({ userId: uid, token: `verify:${token}`, revoked: false });
    if (!rt) return res.status(400).json({ message: "invalid or expired token" });

    await User.findByIdAndUpdate(uid, { verified: true });
    rt.revoked = true;
    await rt.save();

    return res.json({ message: "verified" });
  } catch (err) {
    console.error("verifyEmail error:", err);
    return res.status(500).json({ message: "internal server error" });
  }
}

export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: "email and password required" });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(401).json({ message: "invalid credentials" });

    const correct = await user.comparePassword(password);
    if (!correct) return res.status(401).json({ message: "invalid credentials" });

    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user);
    const expiresAt = new Date(Date.now() + ms(REFRESH_TOKEN_LIFETIME));

    await RefreshToken.create({ userId: user.id, token: refreshToken, expiresAt });

    return res.json({ accessToken, refreshToken, user: { id: user.id, email: user.email, role: user.role } });
  } catch (err) {
    console.error("login error:", err);
    return res.status(500).json({ message: "internal server error" });
  }
}

export async function logout(req: Request, res: Response) {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ message: "refreshToken required" });
    await RefreshToken.findOneAndUpdate({ token: refreshToken }, { revoked: true });
    return res.json({ message: "logged out" });
  } catch (err) {
    console.error("logout error:", err);
    return res.status(500).json({ message: "internal server error" });
  }
}

export async function refresh(req: Request, res: Response) {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ message: "refreshToken required" });

    const payload = verifyRefreshToken(refreshToken);
    const db = await RefreshToken.findOne({ token: refreshToken, revoked: false });
    if (!db) return res.status(401).json({ message: "invalid refresh token" });

    const user = await User.findById((payload as any).sub);
    if (!user) return res.status(401).json({ message: "user not found" });

    // rotate refresh token: revoke old, issue new
    db.revoked = true;
    await db.save();

    const newRefresh = signRefreshToken(user);
    const expiresAt = new Date(Date.now() + ms(REFRESH_TOKEN_LIFETIME));
    await RefreshToken.create({ userId: user.id, token: newRefresh, expiresAt });

    const access = signAccessToken(user);
    return res.json({ accessToken: access, refreshToken: newRefresh });
  } catch (err) {
    console.error("refresh error:", err);
    return res.status(401).json({ message: "invalid refresh token" });
  }
}

export async function forgotPassword(req: Request, res: Response) {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "email required" });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(200).json({ message: "If your account exists you'll get an email" });

    const token = crypto.randomBytes(20).toString("hex");
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1 hour
    await RefreshToken.create({ userId: user.id, token: `reset:${token}`, expiresAt });

    const resetUrl = `${process.env.FRONTEND_URL || ""}/reset-password?token=${token}&uid=${user.id}`;
    sendStubEmail(user.email, "Reset your Yarnitt password", `Reset link: ${resetUrl}`);

    return res.json({ message: "If your account exists you'll get an email" });
  } catch (err) {
    console.error("forgotPassword error:", err);
    return res.status(500).json({ message: "internal server error" });
  }
}

export async function resetPassword(req: Request, res: Response) {
  try {
    const { token, uid, password } = req.body;
    if (!token || !uid || !password) return res.status(400).json({ message: "token, uid and password required" });

    const rt = await RefreshToken.findOne({ userId: uid, token: `reset:${token}`, revoked: false });
    if (!rt) return res.status(400).json({ message: "invalid or expired token" });

    await User.findByIdAndUpdate(uid, { passwordHash: password });
    rt.revoked = true;
    await rt.save();
    return res.json({ message: "password reset" });
  } catch (err) {
    console.error("resetPassword error:", err);
    return res.status(500).json({ message: "internal server error" });
  }
}

export async function me(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ message: "not authenticated" });
    return res.json({ id: user.id, email: user.email, role: user.role, verified: user.verified });
  } catch (err) {
    console.error("me error:", err);
    return res.status(500).json({ message: "internal server error" });
  }
}