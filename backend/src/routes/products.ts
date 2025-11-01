import express from 'express';
import Product from '../models/product';

const router = express.Router();

// GET /products   -> list products
router.get('/', async (req, res) => {
  try {
    const products = await Product.find().limit(100).lean();
    res.json(products);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch products' });
  }
});

// GET /products/:id -> single product
router.get('/:id', async (req, res) => {
  try {
    const p = await Product.findById(req.params.id).lean();
    if (!p) return res.status(404).json({ message: 'Not found' });
    res.json(p);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch product' });
  }
});

export default router;
