import { Router } from 'express';
import {
  registerBuyer,
  registerSeller,
  login,
  getMe,
  forgotPassword,
  resetPassword,
  verifyToken,
} from '../controllers/authController';
import { authenticate } from '../middleware/auth';

const router = Router();

// TODO: Add rate limiting middleware to prevent brute force attacks
// Consider using express-rate-limit package for production
// Example: const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 5 });
// Then apply: router.post('/login', limiter, login);

router.post('/register/buyer', registerBuyer);
router.post('/register/seller', registerSeller);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password/:token', resetPassword);
router.get('/verify-token', verifyToken);
router.get('/me', authenticate, getMe);

export default router;