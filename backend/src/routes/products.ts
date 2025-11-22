import { Router } from 'express';
import {
  createProduct,
  listProducts,
  getProduct,
  updateProduct,
  deleteProduct,
  getSellerProducts,
} from '../controllers/productController';
import { authenticate, requireApprovedSeller } from '../middleware/auth';

const router = Router();

// Public routes
router.get('/', listProducts);

// Seller's own products (must be before /:id to avoid matching)
router.get('/seller/my-products', authenticate, getSellerProducts);

router.get('/:id', getProduct);

// Protected routes - Sellers only
router.post('/', authenticate, requireApprovedSeller, createProduct);
router.put('/:id', authenticate, requireApprovedSeller, updateProduct);
router.delete('/:id', authenticate, requireApprovedSeller, deleteProduct);

export default router;
