import express from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { RateLimiterRedis } from 'rate-limiter-flexible';
import { createClient as createRedisClient } from 'redis';

import User from '../models/User';
import SellerProfile from '../models/SellerProfile';
import RefreshToken from '../models/RefreshToken';
import { signAccessToken, getRefreshExpirySeconds } from '../utils/jwt';
import mailer from '../services/mailer';

const router = express.Router();

function sha256(input: string) {
  return crypto.createHash('sha256').update(input).digest('hex');
}

async function createRefreshTokenDoc(userId: string, plaintextToken: string) {
  const tokenHash = sha256(plaintextToken);
  const expires = new Date(Date.now() + getRefreshExpirySeconds() * 1000);
  return RefreshToken.create({ user: userId, tokenHash, expiresAt: expires });
}

/**
 * rate-limiter-flexible backed limiter for forgot-password
 * - points: 5 per hour, keyed by email (fallback to IP)
 */
const RL_REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
let rlClient: any = null;
let forgotRateLimiter: RateLimiterRedis | null = null;

try {
  rlClient = createRedisClient({ url: RL_REDIS_URL });
  rlClient.connect().catch((e) => {
    // eslint-disable-next-line no-console
    console.error('[rl][redis] connect failed', e);
  });

  forgotRateLimiter = new RateLimiterRedis({
    storeClient: rlClient as any,
    keyPrefix: process.env.RATE_LIMIT_REDIS_PREFIX || 'rl_forgot:',
    points: 5,
    duration: 60 * 60, // 1 hour
  });

  // eslint-disable-next-line no-console
  console.info('[rl] rate-limiter-flexible Redis limiter initialized');
} catch (e: any) {
  // eslint-disable-next-line no-console
  console.error('[rl] Failed to initialize Redis limiter — falling back to no-Redis mode', e);
  rlClient = null;
  forgotRateLimiter = null;
}

async function forgotLimiterMiddleware(req: express.Request, res: express.Response, next: express.NextFunction) {
  try {
    const key = (req.body && req.body.email && String(req.body.email).toLowerCase()) || req.ip || req.socket.remoteAddress || 'anon';
    if (forgotRateLimiter) {
      await forgotRateLimiter.consume(key);
      return next();
    }
    // No Redis limiter available: allow (you can add an in-memory fallback if desired)
    return next();
  } catch (_rej) {
    return res.status(429).json({ error: 'Too many requests for password resets, please try again later' });
  }
}

// --- Routes ---

// Register buyer
router.post('/register', async (req, res) => {
  try {
    const { email, password, name, phone } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ error: 'Email already registered' });

    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({ email, passwordHash: hash, name, phone, role: 'BUYER' });

    // Issue tokens
    const accessToken = signAccessToken({ userId: user._id.toString(), role: user.role });
    const refreshPlain = crypto.randomBytes(48).toString('hex');
    await createRefreshTokenDoc(user._id.toString(), refreshPlain);

    res.json({ user: { id: user._id, email: user.email, name: user.name }, tokens: { accessToken, refreshToken: refreshPlain } });
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.error('register error', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Register seller
router.post('/register-seller', async (req, res) => {
  try {
    const { email, password, name, phone, shopName, bio, kraPin } = req.body;
    if (!email || !password || !shopName) return res.status(400).json({ error: 'email, password and shopName required' });
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ error: 'Email already registered' });

    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({ email, passwordHash: hash, name, phone, role: 'SELLER' });
    const seller = await SellerProfile.create({ user: user._id, shopName, bio, kraPin, approved: false });

    const accessToken = signAccessToken({ userId: user._id.toString(), role: user.role });
    const refreshPlain = crypto.randomBytes(48).toString('hex');
    await createRefreshTokenDoc(user._id.toString(), refreshPlain);

    res.json({ user: { id: user._id, email: user.email, role: user.role }, sellerId: seller._id, tokens: { accessToken, refreshToken: refreshPlain } });
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.error('register-seller error', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });

    const accessToken = signAccessToken({ userId: user._id.toString(), role: user.role });
    const refreshPlain = crypto.randomBytes(48).toString('hex');
    await createRefreshTokenDoc(user._id.toString(), refreshPlain);

    res.json({ user: { id: user._id, email: user.email, role: user.role }, tokens: { accessToken, refreshToken: refreshPlain } });
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.error('login error', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ error: 'refreshToken required' });

    const tokenHash = sha256(refreshToken);
    const doc = await RefreshToken.findOne({ tokenHash });

    if (!doc || doc.revoked) return res.status(401).json({ error: 'Invalid refresh token' });
    if (doc.expiresAt < new Date()) return res.status(401).json({ error: 'Refresh token expired' });

    const newPlain = crypto.randomBytes(48).toString('hex');
    await createRefreshTokenDoc(doc.user.toString(), newPlain);

    doc.revoked = true;
    doc.replacedBy = sha256(newPlain);
    await doc.save();

    const accessToken = signAccessToken({ userId: doc.user.toString() });
    res.json({ accessToken, refreshToken: newPlain });
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.error('refresh error', err);
    res.status(500).json({ error: 'Token refresh failed' });
  }
});

router.post('/logout', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ error: 'refreshToken required' });
    const tokenHash = sha256(refreshToken);
    const doc = await RefreshToken.findOne({ tokenHash });
    if (doc) {
      doc.revoked = true;
      await doc.save();
    }
    res.json({ ok: true });
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.error('logout error', err);
    res.status(500).json({ error: 'Logout failed' });
  }
});

// Forgot password — uses forgotLimiterMiddleware (rate-limiter-flexible)
router.post('/forgot-password', forgotLimiterMiddleware, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'email required' });

    const user = await User.findOne({ email });
    // Do not reveal whether user exists
    if (!user) return res.json({ ok: true });

    const resetPlain = crypto.randomBytes(32).toString('hex');
    const resetHash = sha256(resetPlain);
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    user.resetPasswordTokenHash = resetHash;
    user.resetPasswordExpires = expires;
    await user.save();

    try {
      const info = await mailer.sendResetPasswordEmail(user.email, resetPlain);

      if (mailer.isMailerProd()) {
        return res.json({ ok: true });
      }

      if (mailer.isMailerEthereal()) {
        return res.json({ ok: true, previewUrl: info.previewUrl, expiresAt: expires });
      }

      // Dev mode: include token
      return res.json({ ok: true, resetToken: resetPlain, expiresAt: expires, emailSendInfo: info });
    } catch (sendErr: any) {
      // eslint-disable-next-line no-console
      console.error('Failed to send reset email', sendErr);
      return res.status(500).json({ error: 'Failed to send reset email' });
    }
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.error('forgot-password error', err);
    res.status(500).json({ error: 'Failed to create reset token' });
  }
});

// Reset password
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ error: 'token and password required' });

    const tokenHash = sha256(token);
    const user = await User.findOne({
      resetPasswordTokenHash: tokenHash,
      resetPasswordExpires: { $gt: new Date() },
    });

    if (!user) return res.status(400).json({ error: 'Invalid or expired token' });

    const hash = await bcrypt.hash(password, 10);
    user.passwordHash = hash;
    user.resetPasswordTokenHash = null;
    user.resetPasswordExpires = null;
    await user.save();

    await RefreshToken.updateMany({ user: user._id, revoked: false }, { $set: { revoked: true } });

    res.json({ ok: true });
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.error('reset-password error', err);
    res.status(500).json({ error: 'Password reset failed' });
  }
});

export default router;