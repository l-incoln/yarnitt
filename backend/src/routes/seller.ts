import express from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import Product from '../models/Product';
import SellerProfile from '../models/SellerProfile';
import { upload } from '../middleware/upload';

const router = express.Router();

// Middleware: require seller
router.use(requireAuth('SELLER'));

// GET seller profile (based on req.user.userId)
router.get('/me', async (req: AuthRequest, res) => {
  const userId = req.user.userId;
  const seller = await SellerProfile.findOne({ user: userId });
  res.json(seller);
});

// POST /api/seller/products
router.post('/products', async (req: AuthRequest, res) => {
  const userId = req.user.userId;
  const seller = await SellerProfile.findOne({ user: userId });
  if (!seller) return res.status(403).json({ error: 'Seller profile not found' });

  const { title, slug, description, priceCents, stock = 0, tags = [], images = [], ecoFriendly = false } = req.body;
  const product = await Product.create({
    title,
    slug,
    description,
    priceCents,
    stock,
    tags,
    images,
    ecoFriendly,
    seller: seller._id,
  });
  res.json(product);
});

// PUT /api/seller/products/:id
router.put('/products/:id', async (req: AuthRequest, res) => {
  const userId = req.user.userId;
  const seller = await SellerProfile.findOne({ user: userId });
  if (!seller) return res.status(403).json({ error: 'Seller profile not found' });

  const { id } = req.params;
  const updates = req.body;
  const product = await Product.findOneAndUpdate({ _id: id, seller: seller._id }, updates, { new: true });
  if (!product) return res.status(404).json({ error: 'Product not found or not owned' });
  res.json(product);
});

// DELETE /api/seller/products/:id (soft delete)
router.delete('/products/:id', async (req: AuthRequest, res) => {
  const userId = req.user.userId;
  const seller = await SellerProfile.findOne({ user: userId });
  if (!seller) return res.status(403).json({ error: 'Seller profile not found' });

  const { id } = req.params;
  const product = await Product.findOneAndUpdate({ _id: id, seller: seller._id }, { isActive: false }, { new: true });
  if (!product) return res.status(404).json({ error: 'Product not found or not owned' });
  res.json({ ok: true });
});

/**
 * Upload endpoint
 * POST /api/seller/uploads
 * Form field: image (file)
 * Returns: { url }
 */
router.post('/uploads', upload.single('image'), async (req: AuthRequest, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  // Public URL relative to server host
  const host = req.protocol + '://' + req.get('host');
  const url = `/uploads/${req.file.filename}`;
  res.json({ url, fullUrl: host + url, filename: req.file.filename });
});

/**
 * Attach uploaded image to a product
 * POST /api/seller/products/:id/images
 * Body: { url: string, altText?: string, order?: number }
 */
router.post('/products/:id/images', async (req: AuthRequest, res) => {
  const userId = req.user.userId;
  const seller = await SellerProfile.findOne({ user: userId });
  if (!seller) return res.status(403).json({ error: 'Seller profile not found' });

  const { id } = req.params;
  const { url, altText = '', order = 0 } = req.body;
  if (!url) return res.status(400).json({ error: 'url required' });

  const product = await Product.findOneAndUpdate(
    { _id: id, seller: seller._id },
    { $push: { images: { url, altText, order } } },
    { new: true }
  );

  if (!product) return res.status(404).json({ error: 'Product not found or not owned' });
  res.json(product);
});

export default router;