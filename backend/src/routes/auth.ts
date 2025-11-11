import { Router } from 'express';
import { register, forgotPassword } from '../controllers/auth';
import { forgotPasswordRateLimiter, registerRateLimiter } from '../middleware/rateLimiter';

const router = Router();

// Rate limiting middleware is applied before each handler to prevent abuse
router.post('/auth/register', registerRateLimiter, register);
router.post('/auth/forgot-password', forgotPasswordRateLimiter, forgotPassword);

export default router;