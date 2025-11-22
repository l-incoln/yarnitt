import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import Order from '../models/Order';

/**
 * Validate order creation input
 */
export async function validateOrderCreation(req: Request, res: Response, next: NextFunction) {
  const { items, shippingAddress } = req.body;

  // Validate items array
  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Items array is required and must not be empty' });
  }

  // Validate each item
  for (const item of items) {
    if (!item.product || !mongoose.Types.ObjectId.isValid(item.product)) {
      return res.status(400).json({ error: 'Invalid product ID in items' });
    }
    if (!item.quantity || item.quantity < 1) {
      return res.status(400).json({ error: 'Item quantity must be at least 1' });
    }
  }

  // Validate shipping address
  if (!shippingAddress) {
    return res.status(400).json({ error: 'Shipping address is required' });
  }

  const requiredAddressFields = ['fullName', 'phone', 'address', 'city', 'country'];
  for (const field of requiredAddressFields) {
    if (!shippingAddress[field] || typeof shippingAddress[field] !== 'string') {
      return res.status(400).json({ error: `Shipping address ${field} is required` });
    }
  }

  next();
}

/**
 * Validate order access for authenticated user
 */
export async function validateOrderAccess(req: Request, res: Response, next: NextFunction) {
  try {
    const orderId = req.params.id;
    const user = (req as any).user;

    if (!user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Check if user is buyer, seller, or admin
    const isBuyer = order.buyer.toString() === user._id.toString();
    const isSeller = order.seller.toString() === user._id.toString();
    const isAdmin = user.role === 'admin';

    if (!isBuyer && !isSeller && !isAdmin) {
      return res.status(403).json({ error: 'Not authorized to access this order' });
    }

    // Attach order to request for use in controller
    (req as any).order = order;
    next();
  } catch (err) {
    return res.status(500).json({ error: 'Error validating order access' });
  }
}

/**
 * Validate order status transition
 */
export function validateOrderStatus(req: Request, res: Response, next: NextFunction) {
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({ error: 'Status is required' });
  }

  const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status value' });
  }

  next();
}
