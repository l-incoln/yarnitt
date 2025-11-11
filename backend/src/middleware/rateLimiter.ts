import { Request, Response, NextFunction } from 'express';
import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const redis = new Redis(REDIS_URL);

redis.on('error', (err) => {
  console.error('Redis connection error:', err);
});

/**
 * Rate limiter middleware using Redis
 * Allows a specified number of requests per time window
 */
export function createRateLimiter(options: {
  windowMs: number;  // Time window in milliseconds
  maxRequests: number; // Maximum number of requests allowed in the window
  keyPrefix: string; // Prefix for Redis keys
}) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Use IP address as the identifier (in production, might use user ID)
      const identifier = req.ip || req.socket.remoteAddress || 'unknown';
      const key = `${options.keyPrefix}:${identifier}`;

      // Get current count
      const current = await redis.get(key);
      const count = current ? parseInt(current, 10) : 0;

      if (count >= options.maxRequests) {
        // Rate limit exceeded
        return res.status(429).json({
          error: 'Too many requests, please try again later'
        });
      }

      // Increment counter
      const newCount = await redis.incr(key);

      // Set expiration on first request
      if (newCount === 1) {
        await redis.pexpire(key, options.windowMs);
      }

      // Continue to next middleware
      next();
    } catch (err) {
      console.error('Rate limiter error:', err);
      // On Redis error, allow the request to proceed
      // (fail open rather than fail closed)
      next();
    }
  };
}

// Specific rate limiter for forgot-password endpoint
// Allows 5 requests per 15 minutes
export const forgotPasswordRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5,
  keyPrefix: 'rl:forgot-password'
});

// Rate limiter for register endpoint
// Allows 10 registrations per hour to prevent abuse
export const registerRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 10,
  keyPrefix: 'rl:register'
});
