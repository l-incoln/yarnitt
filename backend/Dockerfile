# backend/Dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY backend/package*.json ./
COPY backend/tsconfig*.json ./
RUN npm ci
COPY backend/ .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist
RUN npm ci --omit=dev
EXPOSE 3000
CMD ["node", "dist/index.js"]
