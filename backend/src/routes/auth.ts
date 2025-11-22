import { Router } from 'express';
import { 
  register,
  registerBuyer,
  registerSeller,
  login,
  logout,
  forgotPassword,
  resetPassword,
  refreshToken,
  getCurrentUser
} from '../controllers/auth';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Registration routes
router.post('/auth/register', register); // Keep for backwards compatibility
router.post('/auth/register-buyer', registerBuyer);
router.post('/auth/register-seller', registerSeller);

// Authentication routes
router.post('/auth/login', login);
router.post('/auth/logout', logout);

// Password management
router.post('/auth/forgot-password', forgotPassword);
router.post('/auth/reset-password/:token', resetPassword);

// Token management
router.post('/auth/refresh-token', refreshToken);

// User info
router.get('/auth/me', requireAuth, getCurrentUser);

export default router;