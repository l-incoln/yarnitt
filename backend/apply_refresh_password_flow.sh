#!/usr/bin/env bash
set -euo pipefail

# Run from repository root. This will:
# - backup existing files
# - write new files for refresh-token + forgot/reset password flow
# - install backend deps, start the backend in background
# - seed DB and run quick tests
# Usage:
#   chmod +x apply_refresh_password_flow.sh
#   ./apply_refresh_password_flow.sh

ROOT="$(pwd)"
BACKEND="$ROOT/backend"
TS_SRC="$BACKEND/src"

echo "Working from $ROOT"

# Ensure backend tree exists
if [ ! -d "$BACKEND" ]; then
  echo "Error: backend directory not found at $BACKEND"
  exit 1
fi

timestamp() { date +%Y%m%d%H%M%S; }
TS="$(timestamp)"

echo "Creating backups of changed files (timestamp: $TS)..."
mkdir -p "$BACKEND"/backups/"$TS"

backup_file() {
  local file="$1"
  if [ -f "$file" ]; then
    cp -v "$file" "$BACKEND/backups/$TS/$(basename "$file").bak"
  fi
}

# Files to overwrite/create
FILES_TO_BACKUP=(
  "$TS_SRC/models/User.ts"
  "$TS_SRC/models/RefreshToken.ts"
  "$TS_SRC/utils/jwt.ts"
  "$TS_SRC/routes/auth.ts"
)

for f in "${FILES_TO_BACKUP[@]}"; do
  backup_file "$f"
done

echo "Writing backend/src/models/User.ts..."
cat > "$TS_SRC/models/User.ts" <<'TS'
import mongoose, { Schema, Document } from 'mongoose';

export type Role = 'BUYER' | 'SELLER' | 'ADMIN';

export interface IUser extends Document {
  email: string;
  passwordHash: string;
  name?: string;
  phone?: string;
  role: Role;
  createdAt: Date;

  // Password reset fields
  resetPasswordTokenHash?: string | null;
  resetPasswordExpires?: Date | null;
}

const UserSchema: Schema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, index: true },
    passwordHash: { type: String, required: true },
    name: { type: String },
    phone: { type: String },
    role: { type: String, enum: ['BUYER', 'SELLER', 'ADMIN'], default: 'BUYER' },

    // Password reset
    resetPasswordTokenHash: { type: String, default: null },
    resetPasswordExpires: { type: Date, default: null },
  },
  { timestamps: true }
);

const User = mongoose.model<IUser>('User', UserSchema);
export default User;
TS

echo "Writing backend/src/models/RefreshToken.ts..."
cat > "$TS_SRC/models/RefreshToken.ts" <<'TS'
import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IRefreshToken extends Document {
  user: Types.ObjectId;
  tokenHash: string;
  revoked: boolean;
  replacedBy?: string | null;
  expiresAt: Date;
  createdAt: Date;
}

const RefreshTokenSchema: Schema = new Schema<IRefreshToken>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tokenHash: { type: String, required: true, index: true },
    revoked: { type: Boolean, default: false },
    replacedBy: { type: String, default: null },
    expiresAt: { type: Date, required: true, index: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

const RefreshToken = mongoose.model<IRefreshToken>('RefreshToken', RefreshTokenSchema);
export default RefreshToken;
TS

echo "Writing backend/src/utils/jwt.ts..."
cat > "$TS_SRC/utils/jwt.ts" <<'TS'
import jwt from 'jsonwebtoken';

const ACCESS_EXPIRY = process.env.ACCESS_TOKEN_EXPIRY || '1h';
const REFRESH_EXPIRY_SECONDS = parseInt(process.env.REFRESH_TOKEN_SECONDS || String(7 * 24 * 60 * 60), 10);

export function signAccessToken(payload: { userId: string; role?: string }) {
  const token = jwt.sign(
    { userId: payload.userId, role: payload.role || 'BUYER' },
    process.env.JWT_SECRET || 'change-me',
    { expiresIn: ACCESS_EXPIRY }
  );
  return token;
}

export function verifyAccess(token: string) {
  return jwt.verify(token, process.env.JWT_SECRET || 'change-me') as any;
}

export function getRefreshExpirySeconds() {
  return REFRESH_EXPIRY_SECONDS;
}
TS

echo "Writing backend/src/routes/auth.ts..."
cat > "$TS_SRC/routes/auth.ts" <<'TS'
import express from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import User from '../models/User';
import SellerProfile from '../models/SellerProfile';
import RefreshToken from '../models/RefreshToken';
import { signAccessToken, getRefreshExpirySeconds } from '../utils/jwt';

const router = express.Router();

function sha256(input: string) {
  return crypto.createHash('sha256').update(input).digest('hex');
}

async function createRefreshTokenDoc(userId: string, plaintextToken: string) {
  const tokenHash = sha256(plaintextToken);
  const expires = new Date(Date.now() + getRefreshExpirySeconds() * 1000);
  return RefreshToken.create({ user: userId, tokenHash, expiresAt: expires });
}

// Register buyer
router.post('/register', async (req, res) => {
  try {
    const { email, password, name, phone } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ error: 'Email already registered' });

    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({ email, passwordHash: hash, name, phone, role: 'BUYER' });

    // Issue tokens: access + refresh (persist refresh)
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

/**
 * Refresh endpoint - rotate refresh tokens
 * Body: { refreshToken: string }
 * Returns: { accessToken, refreshToken }
 */
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ error: 'refreshToken required' });

    const tokenHash = sha256(refreshToken);
    const doc = await RefreshToken.findOne({ tokenHash });

    if (!doc || doc.revoked) return res.status(401).json({ error: 'Invalid refresh token' });
    if (doc.expiresAt < new Date()) return res.status(401).json({ error: 'Refresh token expired' });

    // rotate: create new, mark old revoked and set replacedBy
    const newPlain = crypto.randomBytes(48).toString('hex');
    const newDoc = await createRefreshTokenDoc(doc.user.toString(), newPlain);

    doc.revoked = true;
    doc.replacedBy = sha256(newPlain);
    await doc.save();

    // issue new access
    const accessToken = signAccessToken({ userId: doc.user.toString() });
    res.json({ accessToken, refreshToken: newPlain });
  } catch (err: any) {
    console.error('refresh error', err);
    res.status(500).json({ error: 'Token refresh failed' });
  }
});

/**
 * Logout (revoke the provided refresh token)
 * Body: { refreshToken: string }
 */
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
 * Body: { email }
 * NOTE: In production, send the reset token via email. For dev this returns it in the response.
 */
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'email required' });

    const user = await User.findOne({ email });
    if (!user) return res.json({ ok: true }); // do not reveal existence

    const resetPlain = crypto.randomBytes(32).toString('hex');
    const resetHash = sha256(resetPlain);
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    user.resetPasswordTokenHash = resetHash;
    user.resetPasswordExpires = expires;
    await user.save();

    // In production, email resetPlain to user. For dev return it.
    res.json({ ok: true, resetToken: resetPlain, expiresAt: expires });
  } catch (err: any) {
    console.error('forgot-password error', err);
    res.status(500).json({ error: 'Failed to create reset token' });
  }
});

/**
 * Reset password
 * Body: { token, password }
 */
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

    // Set new password
    const hash = await bcrypt.hash(password, 10);
    user.passwordHash = hash;
    user.resetPasswordTokenHash = null;
    user.resetPasswordExpires = null;
    await user.save();

    // Revoke all existing refresh tokens for safety
    await RefreshToken.updateMany({ user: user._id, revoked: false }, { $set: { revoked: true } });

    res.json({ ok: true });
  } catch (err: any) {
    console.error('reset-password error', err);
    res.status(500).json({ error: 'Password reset failed' });
  }
});

export default router;
TS

echo "Installing backend dependencies (this may take a minute)..."
cd "$BACKEND"
npm install --no-audit --no-fund

echo "Killing any existing ts-node-dev processes (if any)..."
pkill -f ts-node-dev || true

echo "Starting backend dev server in background (logs => /tmp/backend-dev.log)..."
# use nohup so the script can continue; ts-node-dev will watch files.
nohup npm run dev > /tmp/backend-dev.log 2>&1 &
SERVER_PID=$!
echo "Server started with PID $SERVER_PID (logs: /tmp/backend-dev.log)"
cd "$ROOT"

echo "Waiting for server to start..."
sleep 4

echo "Seeding DB (npx ts-node backend/scripts/seed.ts)..."
npx ts-node backend/scripts/seed.ts || true

echo "Quick smoke tests..."

echo "Health check:"
curl -s http://localhost:4000/healthz || true
echo
echo "Products list (first 200 chars):"
curl -s http://localhost:4000/products | sed -n '1,10p' || true
echo

# login to get tokens for buyer@test (seed may have created it)
LOGIN_RESP=$(curl -s -X POST "http://localhost:4000/api/auth/login" -H "Content-Type: application/json" -d '{"email":"buyer@test","password":"pass"}' || true)
echo "Login response (buyer@test):"
echo "$LOGIN_RESP" | sed -n '1,200p'
echo

# extract refresh token using python (fails gracefully if not present)
REFRESH_TOKEN=""
ACCESS_TOKEN=""
if command -v python3 >/dev/null 2>&1; then
  REFRESH_TOKEN=$(echo "$LOGIN_RESP" | python3 -c "import sys, json; d=json.load(sys.stdin) if sys.stdin.readable() else {}; print(d.get('tokens',{}).get('refreshToken',''))" || true)
  ACCESS_TOKEN=$(echo "$LOGIN_RESP" | python3 -c "import sys, json; d=json.load(sys.stdin) if sys.stdin.readable() else {}; print(d.get('tokens',{}).get('accessToken',''))" || true)
fi

if [ -n "$REFRESH_TOKEN" ]; then
  echo "Testing /api/auth/refresh with the returned refresh token..."
  REFRESH_RESP=$(curl -s -X POST "http://localhost:4000/api/auth/refresh" -H "Content-Type: application/json" -d "{\"refreshToken\":\"$REFRESH_TOKEN\"}" || true)
  echo "$REFRESH_RESP" | sed -n '1,200p'
fi

echo "Testing forgot-password (will return reset token in dev):"
FP_RESP=$(curl -s -X POST "http://localhost:4000/api/auth/forgot-password" -H "Content-Type: application/json" -d '{"email":"buyer@test"}' || true)
echo "$FP_RESP" | sed -n '1,200p'
# extract reset token if python3 is available
RESET_TOKEN=""
if command -v python3 >/dev/null 2>&1; then
  RESET_TOKEN=$(echo "$FP_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('resetToken',''))" || true)
fi

if [ -n "$RESET_TOKEN" ]; then
  echo "Testing reset-password with the token returned..."
  RP_RESP=$(curl -s -X POST "http://localhost:4000/api/auth/reset-password" -H "Content-Type: application/json" -d "{\"token\":\"$RESET_TOKEN\",\"password\":\"newpass123\"}" || true)
  echo "$RP_RESP" | sed -n '1,200p'
  echo "Now try logging in with the new password (buyer@test / newpass123):"
  LOGIN_AFTER=$(curl -s -X POST "http://localhost:4000/api/auth/login" -H "Content-Type: application/json" -d '{"email":"buyer@test","password":"newpass123"}' || true)
  echo "$LOGIN_AFTER" | sed -n '1,200p'
fi

echo "All done. Backend log: /tmp/backend-dev.log"
echo "If you want to stop the background dev server run: pkill -f ts-node-dev"
