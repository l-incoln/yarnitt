import express from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import mongoose from 'mongoose';
import Product from '../models/Product';
import Order from '../models/Order';
import Payment from '../models/Payment';
import User from '../models/User';

const router = express.Router();

// Buyer must be authenticated
router.use(requireAuth('BUYER'));

// POST /api/orders
router.post('/', async (req: AuthRequest, res) => {
  const session = await mongoose.startSession();
  try {
    const userId = req.user.userId;
    const { items, shippingAddress, shippingCents = 0 } = req.body;
    if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'No items' });

    session.startTransaction();

    // Build order items and check stock
    let subtotal = 0;
    const orderItems: any[] = [];

    for (const it of items) {
      const product = await Product.findById(it.productId).session(session);
      if (!product) {
        await session.abortTransaction();
        return res.status(400).json({ error: `Product ${it.productId} not found` });
      }
      if (product.stock < it.quantity) {
        await session.abortTransaction();
        return res.status(400).json({ error: `Insufficient stock for ${product.title}` });
      }

      // decrement stock atomically
      const updated = await Product.findOneAndUpdate(
        { _id: product._id, stock: { $gte: it.quantity } },
        { $inc: { stock: -it.quantity } },
        { new: true, session }
      );
      if (!updated) {
        await session.abortTransaction();
        return res.status(400).json({ error: `Failed to reserve stock for ${product.title}` });
      }

      orderItems.push({
        product: product._id,
        title: product.title,
        priceCents: product.priceCents,
        quantity: it.quantity,
      });

      subtotal += product.priceCents * it.quantity;
    }

    const total = subtotal + (shippingCents || 0);
    const order = await Order.create(
      [
        {
          buyer: userId,
          items: orderItems,
          subtotalCents: subtotal,
          shippingCents: shippingCents,
          totalCents: total,
          shippingAddress,
        },
      ],
      { session }
    );

    // create payment record (PENDING)
    const payment = await Payment.create(
      [
        {
          order: order[0]._id,
          user: userId,
          provider: 'MPESA', // or chosen provider
          amountCents: total,
          status: 'PENDING',
        },
      ],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    res.json({ order: order[0], payment: payment[0] });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error('Order creation error', err);
    res.status(500).json({ error: 'Order creation failed' });
  }
});

export default router;
