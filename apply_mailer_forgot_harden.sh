#!/usr/bin/env bash
set -euo pipefail

ROOT="$(pwd)"
BACKEND="$ROOT/backend"
TS_SRC="$BACKEND/src"
SERVICES_DIR="$TS_SRC/services"
ROUTES_DIR="$TS_SRC/routes"

echo "Run from repo root: $ROOT"

# sanity check
if [ ! -d "$BACKEND" ]; then
  echo "Error: backend folder not found at $BACKEND"
  exit 1
fi

timestamp() { date +%Y%m%d%H%M%S; }
TS="$(timestamp)"
BACKUP_DIR="$BACKEND/backups/$TS"
mkdir -p "$BACKUP_DIR"

backup_file() {
  local f="$1"
  if [ -f "$f" ]; then
    echo "Backing up $f -> $BACKUP_DIR/$(basename "$f").bak"
    cp -v "$f" "$BACKUP_DIR/$(basename "$f").bak"
  fi
}

# files to update
MAILER_FILE="$SERVICES_DIR/mailer.ts"
AUTH_FILE="$ROUTES_DIR/auth.ts"
ENV_EXAMPLE="$BACKEND/.env.example"

backup_file "$MAILER_FILE"
backup_file "$AUTH_FILE"
backup_file "$ENV_EXAMPLE"

# ensure dirs
mkdir -p "$SERVICES_DIR"
mkdir -p "$ROUTES_DIR"

echo "Writing $MAILER_FILE..."
cat > "$MAILER_FILE" <<'TS'
import nodemailer from 'nodemailer';

const MAIL_SEND_MODE = process.env.MAIL_SEND_MODE || 'dev'; // 'dev' or 'prod'
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const MAIL_FROM = process.env.MAIL_FROM || 'no-reply@example.com';

// Create transporter depending on mode
function createTransporter() {
  if (MAIL_SEND_MODE === 'prod') {
    // Production: use SMTP config from env
    const host = process.env.SMTP_HOST;
    const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : undefined;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!host || !port || !user || !pass) {
      throw new Error('SMTP configuration missing for MAIL_SEND_MODE=prod. Set SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS.');
    }

    return nodemailer.createTransport({
      host,
      port,
      secure: port === 465, // true for 465, false for other ports
      auth: { user, pass },
    });
  }

  // Dev/test: JSON transport (does not send real emails — returns JSON info)
  return nodemailer.createTransport({ jsonTransport: true });
}

const transporter = createTransporter();

async function sendMail(to: string, subject: string, text: string, html?: string) {
  const msg = {
    from: MAIL_FROM,
    to,
    subject,
    text,
    html,
  };

  const info = await transporter.sendMail(msg);
  // Log for debugging
  // eslint-disable-next-line no-console
  console.info('[mailer] sendMail result:', info);
  return info;
}

export async function sendResetPasswordEmail(to: string, token: string) {
  const resetUrl = `${FRONTEND_URL.replace(/\/$/, '')}/reset-password?token=${encodeURIComponent(token)}`;
  const subject = 'Reset your password';
  const text = `You requested a password reset. Click or open the link to reset your password:\n\n${resetUrl}\n\nIf you didn't request this, ignore this message.`;
  const html = `
    <p>You requested a password reset.</p>
    <p><a href="${resetUrl}">Reset your password</a></p>
    <p>If you didn't request this, ignore this message.</p>
  `;

  return sendMail(to, subject, text, html);
}

// Utility to check if mailer is in prod mode
export function isMailerProd() {
  return MAIL_SEND_MODE === 'prod';
}

export default {
  sendResetPasswordEmail,
  isMailerProd,
};
TS

echo "Writing $AUTH_FILE..."
cat > "$AUTH_FILE" <<'TS'
import express from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import rateLimit from 'express-rate-limit';

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

const forgotLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  keyGenerator: (req) => {
    try {
      const body = req.body || {};
      if (body.email) return String(body.email).toLowerCase();
    } catch (e) {
      // ignore
    }
    return req.ip;
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({ error: 'Too many requests for password resets, please try again later' });
  },
});

// Register buyer
router.post('/register', async (req, res) => {
  try {
    const { email, password, name, phone } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ error: 'Email already registered' });

    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({ email, passwordHash: hash, name, phone, role: 'BUYER' });

    const accessToken = signAccessToken({ userId: user._id.toString(), role: user.role });
    const refreshPlain = crypto.randomBytes(48).toString('hex');
    await createRefreshTokenDoc(user._id.toString(), refreshPlain);

    res.json({ user: { id: user._id, email: user.email, name: user.name }, tokens: { accessToken, refreshToken: refreshPlain } });
  } catch (err: any) {
    console.error('register error', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Register seller (creates user + seller profile pending approval)
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
    console.error('logout error', err);
    res.status(500).json({ error: 'Logout failed' });
  }
});

/**
 * Forgot password - generate a reset token and set expiry.
 * - Rate-limited (see forgotLimiter).
 * - In prod (MAIL_SEND_MODE=prod) the reset token is emailed and NOT returned in response.
 * - In dev mode the token is returned in the JSON response for easier local testing.
 */
router.post('/forgot-password', forgotLimiter, async (req, res) => {
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
      if (mailer.isMailerProd()) {
        // Production mode: send the email and do not include token in response
        await mailer.sendResetPasswordEmail(user.email, resetPlain);
        return res.json({ ok: true });
      } else {
        // Dev/test: return token for convenience
        const info = await mailer.sendResetPasswordEmail(user.email, resetPlain);
        return res.json({ ok: true, resetToken: resetPlain, expiresAt: expires, emailSendInfo: info });
      }
    } catch (sendErr: any) {
      console.error('Failed to send reset email', sendErr);
      return res.status(500).json({ error: 'Failed to send reset email' });
    }
  } catch (err: any) {
    console.error('forgot-password error', err);
    res.status(500).json({ error: 'Failed to create reset token' });
  }
});

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
    console.error('reset-password error', err);
    res.status(500).json({ error: 'Password reset failed' });
  }
});

export default router;
TS

echo "Writing $ENV_EXAMPLE..."
cat > "$ENV_EXAMPLE" <<'ENV'
# Mailer settings
MAIL_SEND_MODE=dev       # 'dev' or 'prod'. In dev the reset token is returned in API response for convenience.
MAIL_FROM="no-reply@example.com"
FRONTEND_URL="http://localhost:3000"

# If MAIL_SEND_MODE=prod, set SMTP credentials:
# SMTP_HOST=smtp.example.com
# SMTP_PORT=587
# SMTP_USER=username
# SMTP_PASS=password
ENV

echo "Installing npm packages (backend)..."
cd "$BACKEND"
npm install nodemailer express-rate-limit
npm install -D @types/nodemailer || true
cd "$ROOT"

echo "Restarting backend dev server..."
pkill -f ts-node-dev || true
nohup bash -lc "cd \"$BACKEND\" && npm run dev" > /tmp/backend-dev.log 2>&1 &

SERVER_PID=$!
echo "Server starting (PID $SERVER_PID). Waiting for startup..."
sleep 2
echo "=== /tmp/backend-dev.log (tail) ==="
tail -n 200 /tmp/backend-dev.log || true

echo
echo "=== Quick smoke tests ==="

echo "Health:"
curl -s http://localhost:4000/healthz || true
echo

echo "Products (first page):"
curl -s http://localhost:4000/products | sed -n '1,6p' || true
echo

echo "Login seeded buyer (buyer@test / pass):"
RESP=$(curl -s -X POST "http://localhost:4000/api/auth/login" -H "Content-Type: application/json" -d '{"email":"buyer@test","password":"pass"}' || true)
echo "$RESP" | sed -n '1,200p'
echo

echo "Forgot-password (dev should return token):"
FP=$(curl -s -X POST "http://localhost:4000/api/auth/forgot-password" -H "Content-Type: application/json" -d '{"email":"buyer@test"}' || true)
echo "$FP" | sed -n '1,200p'
# extract token with Python fallback
RESET=""
if command -v jq >/dev/null 2>&1; then
  RESET=$(echo "$FP" | jq -r '.resetToken' 2>/dev/null || true)
else
  RESET=$(echo "$FP" | python3 - <<'PY'
import sys, json
try:
    d=json.load(sys.stdin)
    print(d.get('resetToken',''))
except:
    print('')
PY
)
fi
echo "RESET='$RESET'"

if [ -n "$RESET" ]; then
  echo "Calling reset-password with returned token..."
  curl -s -X POST "http://localhost:4000/api/auth/reset-password" -H "Content-Type: application/json" -d "{\"token\":\"$RESET\",\"password\":\"newpass123\"}" | sed -n '1,200p'
  echo
  echo "Verify login with new password:"
  curl -s -X POST "http://localhost:4000/api/auth/login" -H "Content-Type: application/json" -d '{"email":"buyer@test","password":"newpass123"}' | sed -n '1,200p'
else
  echo "No reset token returned; check /tmp/backend-dev.log for errors."
  tail -n 200 /tmp/backend-dev.log || true
fi

echo "Script complete. Backups are in $BACKUP_DIR"
