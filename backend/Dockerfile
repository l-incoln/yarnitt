FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY backend/package*.json ./

# Install all dependencies (including devDependencies for building)
RUN npm ci

# Copy source code
COPY backend/tsconfig.json ./
COPY backend/src ./src

# Build TypeScript
RUN npx tsc

# Expose port
EXPOSE 4000

# Start the application
CMD ["npm", "start"]
