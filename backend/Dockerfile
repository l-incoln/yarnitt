FROM node:20-alpine AS builder
WORKDIR /app

# copy package files first for cached install
COPY backend/package*.json ./
COPY backend/tsconfig*.json ./
RUN npm ci

# copy sources and build
COPY backend/ .
RUN npm run build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

# copy production artifacts
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist

# install only production deps
RUN npm ci --omit=dev

EXPOSE 3000
CMD ["node", "dist/index.js"]

# --- Test stage: installs dev deps so tests can run inside container ---
FROM node:20-alpine AS test
WORKDIR /app
# copy package json and full source for test stage
COPY backend/package*.json ./
COPY backend/ ./
# install dev dependencies too for running tests in container
RUN npm ci
# build if your tests rely on compiled output
RUN npm run build || true
# default command for CI to override: runs tests
CMD ["sh", "-c", "npm ci --silent && npx jest --runInBand --config jest.config.cjs"]
