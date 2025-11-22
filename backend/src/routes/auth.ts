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

router.post('/register/buyer', registerBuyer);
router.post('/register/seller', registerSeller);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password/:token', resetPassword);
router.get('/verify-token', verifyToken);
router.get('/me', authenticate, getMe);

export default router;