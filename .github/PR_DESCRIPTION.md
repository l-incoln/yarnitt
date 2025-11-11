# Consolidate duplicate services and add Redis configuration

## Summary
This PR consolidates duplicate backend/service naming in `docker-compose.yml` and adds a Redis service with proper network configuration for the backend service to connect to Redis on the compose network instead of 127.0.0.1.

## Why This Was Needed
- **Duplicate backend/service naming**: The docker-compose.yml had duplicate or missing service definitions that needed consolidation
- **App connecting to 127.0.0.1**: The application was configured to connect to Redis at 127.0.0.1, which doesn't work when running in Docker Compose where services should connect via service names on the compose network

## Changes Made
1. Added `backend` service to docker-compose.yml with:
   - Dockerfile build configuration
   - REDIS environment variables (`REDIS_HOST`, `REDIS_PORT`, `REDIS_URL`) pointing to `redis-local`
   - Network configuration to join the compose network

2. Configured `redis` service with network alias `redis-local` so the backend can resolve it by this hostname

3. Added `mongo` service since the backend application uses MongoDB (not Postgres)

4. Created `backend/Dockerfile` to build the backend service image

5. Created `tests/integration/run-forgot-rl.js` integration test for rate limiting verification

6. Configured all services to use a shared `yarnitt-network` for inter-service communication

## Verification Steps

Run the following commands to verify the changes:

1. **Start all services**:
   ```bash
   docker compose up -d --build
   ```

2. **Verify backend can resolve redis-local hostname**:
   ```bash
   docker compose exec backend bash -lc 'getent hosts redis-local'
   ```

3. **Verify backend can connect to Redis on TCP**:
   ```bash
   docker compose exec backend bash -lc 'timeout 3 bash -c "cat < /dev/tcp/redis-local/6379 >/dev/null 2>&1" && echo redis tcp OK || echo redis tcp FAIL'
   ```

4. **Run rate limiting integration test**:
   ```bash
   node ./tests/integration/run-forgot-rl.js
   ```
   Expected output: `[200,200,200,200,200,429]` showing 5 successful requests followed by rate-limited response
