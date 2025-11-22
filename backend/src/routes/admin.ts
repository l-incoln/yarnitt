import { Router } from 'express';
import { 
  getAllSellers,
  getPendingSellers,
  approveSeller,
  rejectSeller,
  banSeller
} from '../controllers/admin';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

// All admin routes require authentication and admin role
router.use(requireAuth);
router.use(requireRole('admin'));

// Seller management routes
router.get('/sellers', getAllSellers);
router.get('/sellers/pending', getPendingSellers);
router.put('/sellers/:id/approve', approveSeller);
router.put('/sellers/:id/reject', rejectSeller);
router.put('/sellers/:id/ban', banSeller);

export default router;
