import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import { validateOrderCreation, validateOrderAccess, validateOrderStatus } from '../middleware/orderValidation';
import {
  createOrder,
  getBuyerOrders,
  getSellerOrders,
  getOrderById,
  updateOrderStatus,
  cancelOrder,
  shipOrder,
  confirmDelivery,
  confirmOrder,
  getAllOrders,
  getOrderStats,
  refundOrder,
} from '../controllers/orderController';

const router = Router();

// Admin endpoints (place before specific :id routes)
router.get('/all', requireAuth, requireRole('admin'), getAllOrders);
router.get('/stats', requireAuth, requireRole('admin'), getOrderStats);

// Buyer endpoints
router.post('/', requireAuth, validateOrderCreation, createOrder);
router.get('/buyer', requireAuth, getBuyerOrders);

// Seller endpoints
router.get('/seller', requireAuth, getSellerOrders);

// Specific order routes (place after /buyer, /seller, /all, /stats)
router.get('/:id', requireAuth, validateOrderAccess, getOrderById);
router.patch('/:id/cancel', requireAuth, validateOrderAccess, cancelOrder);
router.patch('/:id/confirm-delivery', requireAuth, validateOrderAccess, confirmDelivery);
router.patch('/:id/confirm', requireAuth, validateOrderAccess, confirmOrder);
router.patch('/:id/ship', requireAuth, validateOrderAccess, shipOrder);
router.patch('/:id/status', requireAuth, validateOrderAccess, validateOrderStatus, updateOrderStatus);
router.patch('/:id/refund', requireAuth, requireRole('admin'), validateOrderAccess, refundOrder);

export default router;
