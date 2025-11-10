import express from 'express';
import Product from '../models/Product';

const router = express.Router();

// GET /products?q=&page=&limit=
router.get('/', async (req, res) => {
  const { q, page = '1', limit = '12', tag, eco } = req.query;
  const pageNum = Math.max(1, parseInt(page as string, 10));
  const take = Math.min(100, parseInt(limit as string, 10));

  const where: any = { isActive: true };
  if (q) {
    where.$or = [{ title: new RegExp(String(q), 'i') }, { description: new RegExp(String(q), 'i') }];
  }
  if (tag) where.tags = { $in: [String(tag)] };
  if (eco) where.ecoFriendly = eco === 'true';

  const [items, total] = await Promise.all([
    Product.find(where).populate('seller').skip((pageNum - 1) * take).limit(take).lean(),
    Product.countDocuments(where),
  ]);

  res.json({ data: items, meta: { page: pageNum, limit: take, total } });
});

// GET /products/:id
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  const product = await Product.findById(id).populate('seller');
  if (!product) return res.status(404).json({ error: 'Not found' });
  res.json(product);
});

export default router;
