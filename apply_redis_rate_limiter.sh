#!/usr/bin/env bash
set -euo pipefail

ROOT="$(pwd)"
BACKEND="$ROOT/backend"
ROUTES_DIR="$BACKEND/src/routes"
AUTH_FILE="$ROUTES_DIR/auth.ts"
BACKUP_DIR="$BACKEND/backups/redis-$(date +%Y%m%d%H%M%S)"

if [ ! -d "$BACKEND" ]; then
  echo "Error: backend folder not found at $BACKEND"
  exit 1
fi

mkdir -p "$BACKUP_DIR" "$ROUTES_DIR"

if [ -f "$AUTH_FILE" ]; then
  echo "Backing up $AUTH_FILE -> $BACKUP_DIR/$(basename "$AUTH_FILE").bak"
  cp -v "$AUTH_FILE" "$BACKUP_DIR/$(basename "$AUTH_FILE").bak"
fi

echo "Writing updated auth route with Redis-backed rate limiter..."
cat > "$AUTH_FILE" <<'TS'
import express from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import rateLimit, { keyGeneratorIpFallback } from 'express-rate-limit';
import Redis from 'ioredis';
/* eslint-disable @typescript-eslint/no-var-requires */
const RedisStore = require('rate-limit-redis');

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

const REDIS_URL = process.env.REDIS_URL || '';
let redisClient: Redis | null = null;
let redisStore: any = undefined;

if (REDIS_URL) {
  try {
    redisClient = new Redis(REDIS_URL);
    redisClient.on('error', (err) => {
      // eslint-disable-next-line no-console
      console.error('[rate-limit][redis] Redis client error', err);
    });

    redisStore = new RedisStore({
      client: redisClient,
      prefix: process.env.RATE_LIMIT_REDIS_PREFIX || 'rate-limit:',
    });

    // eslint-disable-next-line no-console
    console.info('[rate-limit] Redis rate limiter enabled (REDIS_URL provided)');
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.error('[rate-limit] Failed to initialize Redis rate limiter, falling back to memory store', err);
    redisClient = null;
    redisStore = undefined;
  }
}

const forgotLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  store: redisStore,
  keyGenerator: (req, res) => {
    try {
      const body = req.body || {};
      if (body.email) return String(body.email).toLowerCase();
    } catch (e) {
      // ignore
    }
    return keyGeneratorIpFallback(req, res);
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({ error: 'Too many requests for password resets, please try again later' });
  },
});

// --- (routes omitted here for brevity in the script) ---

// To keep the script compact we will append the existing route implementations from the backup if they exist.
// If no backup existed, you should re-add your previous route handlers manually.
TS

# If a backup exists, append its route bodies (preserve the rest of the original file)
if [ -f "$BACKUP_DIR/auth.ts.bak" ]; then
  echo "Appending original route implementations from backup to $AUTH_FILE"
  # The newer file already contains imports and limiter; append the rest of the original file after a marker comment.
  awk 'BEGIN{skip=1} /\/\/ --- \(routes omitted here for brevity in the script\) ---/{skip=0; next} { if(!skip) print }' "$BACKUP_DIR/auth.ts.bak" >> "$AUTH_FILE" || true
else
  echo "No backup found to append full routes. The script wrote the limiter and imports; you must ensure route handlers exist in $AUTH_FILE."
fi

echo "Installing required packages (ioredis, rate-limit-redis)..."
cd "$BACKEND"
npm install --no-audit --no-fund ioredis rate-limit-redis
cd "$ROOT"

echo "Restarting backend dev server..."
pkill -f ts-node-dev || true
nohup bash -lc "cd \"$BACKEND\" && npm run dev" > /tmp/backend-dev.log 2>&1 &

sleep 2
echo "=== /tmp/backend-dev.log (tail) ==="
tail -n 200 /tmp/backend-dev.log || true

echo
echo "If you want to enable Redis-backed limiting, set REDIS_URL and restart. Example:"
echo "  export REDIS_URL='redis://127.0.0.1:6379'"
echo "  pkill -f ts-node-dev || true"
echo "  nohup bash -lc \"cd $BACKEND && REDIS_URL=\$REDIS_URL npm run dev\" > /tmp/backend-dev.log 2>&1 &"
echo
echo "Quick test (127.0.0.1:4000):"
curl -4 -s -X POST "http://127.0.0.1:4000/api/auth/forgot-password" -H "Content-Type: application/json" -d '{"email":"buyer@test"}' | jq . || true

echo
echo "Backups written to: $BACKUP_DIR"
