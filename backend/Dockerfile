# Use Debian-based node image so mongodb-memory-server can download & run MongoDB binaries
FROM node:20-bullseye AS base

WORKDIR /app

# Copy package metadata and install deps (dev deps included for tests)
COPY backend/package*.json ./
COPY backend/ ./

# Install packages (ci installs strictly from lockfile)
RUN npm ci

# Build (if project uses a build step); ignore failure if not present
RUN npm run build || true

FROM base AS test
WORKDIR /app
CMD [ "node" ]
