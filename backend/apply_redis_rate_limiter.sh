#!/usr/bin/env bash
set -euo pipefail

ROOT="$(pwd)"
BACKEND="$ROOT/backend"
SRV_DIR="$BACKEND/src/services"
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

echo "Writing updated auth route (with Redis-based rate limiter)..."
cat > "$AUTH_FILE" <<'TS'
IMPORT_PLACEHOLDER
TS

# Replace the placeholder with the actual file content (this avoids shell quoting issues)
python3 - "$AUTH_FILE" <<'PY' || true
import sys, io, os
content = r"""
<REPLACE_CONTENT>
"""
with open(sys.argv[1], "w", encoding="utf-8") as f:
    f.write(content)
PY

echo "Installing Redis and rate-limit store packages in backend..."
cd "$BACKEND"
npm install --no-audit --no-fund ioredis rate-limit-redis
cd "$ROOT"

echo "Restarting backend (dev) in background (MAIL_SEND_MODE preserves existing or you can set it)..."
pkill -f ts-node-dev || true
nohup bash -lc "cd \"$BACKEND\" && npm run dev" > /tmp/backend-dev.log 2>&1 &

sleep 2
echo "=== /tmp/backend-dev.log (tail) ==="
tail -n 200 /tmp/backend-dev.log || true

echo
echo "Running quick forgot-password test (127.0.0.1:4000)..."
curl -4 -s -X POST "http://127.0.0.1:4000/api/auth/forgot-password" -H "Content-Type: application/json" -d '{"email":"buyer@test"}' | jq . || true

echo
echo "Backups written to $BACKUP_DIR"
