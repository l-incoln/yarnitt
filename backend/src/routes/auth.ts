import { Router } from 'express';
import { register, forgotPassword } from '../controllers/auth';

const router = Router();

router.post('/auth/register', register);
router.post('/auth/forgot-password', forgotPassword);

export default router;