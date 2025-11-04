#!/usr/bin/env bash
set -euo pipefail

# dev-start: reliably start local development services: MongoDB, backend, frontend
# Usage: ./scripts/dev-start.sh

ROOT_DIR="$(cd ""$(dirname "${BASH_SOURCE[0]}")"/.." && pwd)"
LOGDIR="/tmp/yarnitt-dev-logs"
mkdir -p "$LOGDIR"

info(){ echo "[INFO] $*"; }
err(){ echo "[ERROR] $*" >&2; }

# 1) Ensure MongoDB is running and reachable on 127.0.0.1:27017
wait_for_mongo(){
  local retries=20
  local wait=1
  info "Checking MongoDB on 127.0.0.1:27017..."
  for i in $(seq 1 $retries); do
    if nc -z 127.0.0.1 27017 2>/dev/null; then
      info "MongoDB is listening"
      return 0
    fi
    info "MongoDB not ready yet (attempt $i/$retries). Trying to start system service if available..."
    if command -v systemctl >/dev/null 2>&1; then
      sudo systemctl start mongod || true
    fi
    sleep $wait
  done
  err "MongoDB did not become available on 127.0.0.1:27017. Check /var/log/mongodb/mongod.log or run scripts/fix-mongo-users.sh"
  return 1
}

# 2) Start backend (assumes backend lives in backend/ and has npm scripts)
start_backend(){
  if [ -d "$ROOT_DIR/backend" ]; then
    info "Starting backend (backend/)"
    (cd "$ROOT_DIR/backend" && npm run dev > "$LOGDIR/backend.log" 2>&1 &) 
    info "Backend started (logs: $LOGDIR/backend.log)"
  else
    info "No backend/ directory found — skipping backend start"
  fi
}

# 3) Start frontend (assumes frontend in frontend/ or web/)
start_frontend(){
  if [ -d "$ROOT_DIR/frontend" ]; then
    info "Starting frontend (frontend/)"
    (cd "$ROOT_DIR/frontend" && npm run dev > "$LOGDIR/frontend.log" 2>&1 &) 
    info "Frontend started (logs: $LOGDIR/frontend.log)"
  elif [ -d "$ROOT_DIR/web" ]; then
    info "Starting web/"
    (cd "$ROOT_DIR/web" && npm run dev > "$LOGDIR/frontend.log" 2>&1 &) 
    info "Frontend started (logs: $LOGDIR/frontend.log)"
  else
    info "No frontend folder found (frontend/ or web/) — skipping frontend start"
  fi
}

# 4) Print helpful status
print_status(){
  info "Services started. Logs: $LOGDIR"
  echo
  sudo ss -ltnp | egrep ':27017\b' || true
  echo
  info "To view logs: tail -f $LOGDIR/backend.log $LOGDIR/frontend.log"
}

main(){
  wait_for_mongo || exit 1
  start_backend
  start_frontend
  print_status
}

main
