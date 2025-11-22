import { Request, Response } from 'express';
import Order from '../models/Order';
import Product from '../models/product';
import { generateOrderNumber, calculateCommission, canCancelOrder, canUpdateStatus } from '../utils/orderUtils';
import { ORDER_STATUS, PAYMENT_STATUS, DEFAULT_DELIVERY_DAYS } from '../constants/orderConstants';

/**
 * Create a new order
 * POST /api/orders
 */
export async function createOrder(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    const { items, shippingAddress, paymentMethod = 'pending', customization } = req.body;

    // Validate and fetch products
    const productIds = items.map((item: any) => item.product);
    const products = await Product.find({ _id: { $in: productIds } });

    if (products.length !== items.length) {
      return res.status(400).json({ error: 'One or more products not found' });
    }

    // Create a map for easy lookup
    const productMap = new Map(products.map((p) => [p._id.toString(), p]));

    // Validate stock and calculate total
    let totalAmount = 0;
    const orderItems = [];
    let primarySeller = null;

    for (const item of items) {
      const product = productMap.get(item.product.toString());
      if (!product) {
        return res.status(400).json({ error: `Product ${item.product} not found` });
      }

      if (product.stock < item.quantity) {
        return res.status(400).json({
          error: `Insufficient stock for product ${product.name}. Available: ${product.stock}, Requested: ${item.quantity}`,
        });
      }

      const itemTotal = product.price * item.quantity;
      totalAmount += itemTotal;

      orderItems.push({
        product: product._id,
        quantity: item.quantity,
        priceAtPurchase: product.price,
        customization: item.customization,
      });

      // Use the first product's seller as primary seller
      if (!primarySeller) {
        primarySeller = product.seller;
      }
    }

    if (!primarySeller) {
      return res.status(400).json({ error: 'No seller found for products' });
    }

    // Calculate commission
    const { commission, sellerEarnings } = calculateCommission(totalAmount);

    // Generate unique order number
    const orderNumber = await generateOrderNumber();

    // Create order
    const order = new Order({
      orderNumber,
      buyer: user._id,
      seller: primarySeller,
      items: orderItems,
      totalAmount,
      commission,
      sellerEarnings,
      status: ORDER_STATUS.PENDING,
      paymentMethod,
      paymentStatus: PAYMENT_STATUS.PENDING,
      shippingAddress,
    });

    await order.save();

    // Reduce stock for each product
    for (const item of items) {
      const product = productMap.get(item.product.toString());
      if (product) {
        product.stock -= item.quantity;
        product.sold = (product.sold || 0) + item.quantity;
        await product.save();
      }
    }

    // Populate order details for response
    await order.populate('buyer', 'name email');
    await order.populate('seller', 'name email shopName');
    await order.populate('items.product', 'name price');

    return res.status(201).json({
      message: 'Order created successfully',
      order,
    });
  } catch (err: any) {
    console.error('createOrder error:', err);
    return res.status(500).json({ error: 'Failed to create order' });
  }
}

/**
 * Get all orders for buyer
 * GET /api/orders/buyer
 */
export async function getBuyerOrders(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    const { status, startDate, endDate, search, page = 1, limit = 20 } = req.query;

    const query: any = { buyer: user._id };

    // Apply filters
    if (status) {
      query.status = status;
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate as string);
      }
      if (endDate) {
        query.createdAt.$lte = new Date(endDate as string);
      }
    }

    if (search) {
      query.orderNumber = { $regex: search, $options: 'i' };
    }

    const skip = (Number(page) - 1) * Number(limit);

    const orders = await Order.find(query)
      .populate('seller', 'name email shopName')
      .populate('items.product', 'name price')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await Order.countDocuments(query);

    return res.json({
      orders,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (err) {
    console.error('getBuyerOrders error:', err);
    return res.status(500).json({ error: 'Failed to fetch orders' });
  }
}

/**
 * Get all orders for seller
 * GET /api/orders/seller
 */
export async function getSellerOrders(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    const { status, startDate, endDate, search, page = 1, limit = 20 } = req.query;

    const query: any = { seller: user._id };

    // Apply filters
    if (status) {
      query.status = status;
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate as string);
      }
      if (endDate) {
        query.createdAt.$lte = new Date(endDate as string);
      }
    }

    if (search) {
      query.orderNumber = { $regex: search, $options: 'i' };
    }

    const skip = (Number(page) - 1) * Number(limit);

    const orders = await Order.find(query)
      .populate('buyer', 'name email phone')
      .populate('items.product', 'name price')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await Order.countDocuments(query);

    // Calculate statistics
    const stats = await Order.aggregate([
      { $match: { seller: user._id } },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: '$sellerEarnings' },
          pendingOrders: {
            $sum: { $cond: [{ $eq: ['$status', ORDER_STATUS.PENDING] }, 1, 0] },
          },
        },
      },
    ]);

    return res.json({
      orders,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
      stats: stats[0] || { totalOrders: 0, totalRevenue: 0, pendingOrders: 0 },
    });
  } catch (err) {
    console.error('getSellerOrders error:', err);
    return res.status(500).json({ error: 'Failed to fetch orders' });
  }
}

/**
 * Get single order by ID
 * GET /api/orders/:id
 */
export async function getOrderById(req: Request, res: Response) {
  try {
    const order = (req as any).order; // Already fetched and validated by middleware

    await order.populate('buyer', 'name email phone address');
    await order.populate('seller', 'name email shopName phone');
    await order.populate('items.product', 'name price description');

    return res.json({ order });
  } catch (err) {
    console.error('getOrderById error:', err);
    return res.status(500).json({ error: 'Failed to fetch order' });
  }
}

/**
 * Update order status
 * PATCH /api/orders/:id/status
 */
export async function updateOrderStatus(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    const order = (req as any).order;
    const { status } = req.body;

    // Validate status transition
    const validation = canUpdateStatus(order.status, status);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    // Check permissions
    const isSeller = order.seller.toString() === user._id.toString();
    const isAdmin = user.role === 'admin';

    if (!isSeller && !isAdmin) {
      return res.status(403).json({ error: 'Only seller or admin can update order status' });
    }

    // Update status and related timestamps
    order.status = status;

    if (status === ORDER_STATUS.DELIVERED) {
      order.deliveredAt = new Date();
    } else if (status === ORDER_STATUS.CANCELLED) {
      order.cancelledAt = new Date();
    }

    await order.save();

    return res.json({
      message: 'Order status updated successfully',
      order,
    });
  } catch (err) {
    console.error('updateOrderStatus error:', err);
    return res.status(500).json({ error: 'Failed to update order status' });
  }
}

/**
 * Cancel order
 * PATCH /api/orders/:id/cancel
 */
export async function cancelOrder(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    const order = (req as any).order;
    const { reason } = req.body;

    // Only buyer can cancel their order
    if (order.buyer.toString() !== user._id.toString() && user.role !== 'admin') {
      return res.status(403).json({ error: 'Only the buyer can cancel this order' });
    }

    // Check if order can be cancelled
    if (!canCancelOrder(order.status)) {
      return res.status(400).json({
        error: `Cannot cancel order with status ${order.status}. Orders can only be cancelled when pending or confirmed.`,
      });
    }

    // Restore stock for all items
    for (const item of order.items) {
      const product = await Product.findById(item.product);
      if (product) {
        product.stock += item.quantity;
        product.sold = Math.max(0, (product.sold || 0) - item.quantity);
        await product.save();
      }
    }

    // Update order
    order.status = ORDER_STATUS.CANCELLED;
    order.cancelledAt = new Date();
    order.cancellationReason = reason || 'Cancelled by buyer';
    await order.save();

    return res.json({
      message: 'Order cancelled successfully',
      order,
    });
  } catch (err) {
    console.error('cancelOrder error:', err);
    return res.status(500).json({ error: 'Failed to cancel order' });
  }
}

/**
 * Ship order
 * PATCH /api/orders/:id/ship
 */
export async function shipOrder(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    const order = (req as any).order;
    const { trackingNumber } = req.body;

    // Check permissions
    const isSeller = order.seller.toString() === user._id.toString();
    const isAdmin = user.role === 'admin';

    if (!isSeller && !isAdmin) {
      return res.status(403).json({ error: 'Only seller or admin can ship order' });
    }

    // Verify order status
    if (order.status !== ORDER_STATUS.CONFIRMED && order.status !== ORDER_STATUS.PROCESSING) {
      return res.status(400).json({
        error: `Cannot ship order with status ${order.status}. Order must be confirmed or processing.`,
      });
    }

    if (!trackingNumber) {
      return res.status(400).json({ error: 'Tracking number is required' });
    }

    // Update order
    order.status = ORDER_STATUS.SHIPPED;
    order.trackingNumber = trackingNumber;

    // Calculate estimated delivery (7 days from now)
    const estimatedDelivery = new Date();
    estimatedDelivery.setDate(estimatedDelivery.getDate() + DEFAULT_DELIVERY_DAYS);
    order.estimatedDelivery = estimatedDelivery;

    await order.save();

    return res.json({
      message: 'Order shipped successfully',
      order,
    });
  } catch (err) {
    console.error('shipOrder error:', err);
    return res.status(500).json({ error: 'Failed to ship order' });
  }
}

/**
 * Confirm delivery
 * PATCH /api/orders/:id/confirm-delivery
 */
export async function confirmDelivery(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    const order = (req as any).order;

    // Only buyer can confirm delivery
    if (order.buyer.toString() !== user._id.toString() && user.role !== 'admin') {
      return res.status(403).json({ error: 'Only the buyer can confirm delivery' });
    }

    // Verify order status
    if (order.status !== ORDER_STATUS.SHIPPED) {
      return res.status(400).json({
        error: `Cannot confirm delivery for order with status ${order.status}. Order must be shipped.`,
      });
    }

    // Update order
    order.status = ORDER_STATUS.DELIVERED;
    order.deliveredAt = new Date();
    await order.save();

    return res.json({
      message: 'Delivery confirmed successfully',
      order,
    });
  } catch (err) {
    console.error('confirmDelivery error:', err);
    return res.status(500).json({ error: 'Failed to confirm delivery' });
  }
}

/**
 * Confirm order (seller action)
 * PATCH /api/orders/:id/confirm
 */
export async function confirmOrder(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    const order = (req as any).order;

    // Check permissions
    const isSeller = order.seller.toString() === user._id.toString();
    const isAdmin = user.role === 'admin';

    if (!isSeller && !isAdmin) {
      return res.status(403).json({ error: 'Only seller or admin can confirm order' });
    }

    // Verify order status
    if (order.status !== ORDER_STATUS.PENDING) {
      return res.status(400).json({
        error: `Cannot confirm order with status ${order.status}. Order must be pending.`,
      });
    }

    // Update order
    order.status = ORDER_STATUS.CONFIRMED;
    await order.save();

    return res.json({
      message: 'Order confirmed successfully',
      order,
    });
  } catch (err) {
    console.error('confirmOrder error:', err);
    return res.status(500).json({ error: 'Failed to confirm order' });
  }
}

/**
 * Get all orders (admin only)
 * GET /api/orders/all
 */
export async function getAllOrders(req: Request, res: Response) {
  try {
    const { status, startDate, endDate, search, page = 1, limit = 20 } = req.query;

    const query: any = {};

    // Apply filters
    if (status) {
      query.status = status;
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate as string);
      }
      if (endDate) {
        query.createdAt.$lte = new Date(endDate as string);
      }
    }

    if (search) {
      query.orderNumber = { $regex: search, $options: 'i' };
    }

    const skip = (Number(page) - 1) * Number(limit);

    const orders = await Order.find(query)
      .populate('buyer', 'name email')
      .populate('seller', 'name email shopName')
      .populate('items.product', 'name price')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await Order.countDocuments(query);

    return res.json({
      orders,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (err) {
    console.error('getAllOrders error:', err);
    return res.status(500).json({ error: 'Failed to fetch orders' });
  }
}

/**
 * Get order statistics (admin only)
 * GET /api/orders/stats
 */
export async function getOrderStats(req: Request, res: Response) {
  try {
    const { startDate, endDate } = req.query;

    const matchQuery: any = {};
    if (startDate || endDate) {
      matchQuery.createdAt = {};
      if (startDate) {
        matchQuery.createdAt.$gte = new Date(startDate as string);
      }
      if (endDate) {
        matchQuery.createdAt.$lte = new Date(endDate as string);
      }
    }

    // Overall statistics
    const stats = await Order.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: '$totalAmount' },
          totalCommission: { $sum: '$commission' },
          averageOrderValue: { $avg: '$totalAmount' },
        },
      },
    ]);

    // Orders by status
    const ordersByStatus = await Order.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    // Top selling products
    const topProducts = await Order.aggregate([
      { $match: matchQuery },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product',
          totalQuantity: { $sum: '$items.quantity' },
          totalRevenue: { $sum: { $multiply: ['$items.quantity', '$items.priceAtPurchase'] } },
        },
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'product',
        },
      },
      { $unwind: '$product' },
      {
        $project: {
          productId: '$_id',
          name: '$product.name',
          totalQuantity: 1,
          totalRevenue: 1,
        },
      },
    ]);

    return res.json({
      overall: stats[0] || { totalOrders: 0, totalRevenue: 0, totalCommission: 0, averageOrderValue: 0 },
      ordersByStatus: ordersByStatus.reduce(
        (acc, item) => {
          acc[item._id] = item.count;
          return acc;
        },
        {} as Record<string, number>
      ),
      topProducts,
    });
  } catch (err) {
    console.error('getOrderStats error:', err);
    return res.status(500).json({ error: 'Failed to fetch order statistics' });
  }
}

/**
 * Process refund (admin only)
 * PATCH /api/orders/:id/refund
 */
export async function refundOrder(req: Request, res: Response) {
  try {
    const order = (req as any).order;
    const { reason } = req.body;

    // Check if order can be refunded
    if (order.status !== ORDER_STATUS.DELIVERED && order.status !== ORDER_STATUS.CANCELLED) {
      return res.status(400).json({
        error: 'Only delivered or cancelled orders can be refunded',
      });
    }

    // Restore stock for all items
    for (const item of order.items) {
      const product = await Product.findById(item.product);
      if (product) {
        product.stock += item.quantity;
        product.sold = Math.max(0, (product.sold || 0) - item.quantity);
        await product.save();
      }
    }

    // Update order
    order.status = ORDER_STATUS.REFUNDED;
    order.paymentStatus = PAYMENT_STATUS.REFUNDED;
    order.notes = reason || 'Refund processed by admin';
    await order.save();

    return res.json({
      message: 'Order refunded successfully',
      order,
    });
  } catch (err) {
    console.error('refundOrder error:', err);
    return res.status(500).json({ error: 'Failed to refund order' });
  }
}
