import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import express from 'express';
import bodyParser from 'body-parser';
import orderRoutes from '../src/routes/orders';
import authRoutes from '../src/routes/auth';
import { User } from '../src/models/User';
import Product from '../src/models/product';
import Order from '../src/models/Order';
import { ORDER_STATUS } from '../src/constants/orderConstants';

let mongod: MongoMemoryServer | undefined;
let app: express.Express;
let buyerToken: string;
let sellerToken: string;
let adminToken: string;
let buyerId: string;
let sellerId: string;
let productId: string;

beforeAll(async () => {
  const useUri = process.env.MONGO_URI;
  if (useUri) {
    await mongoose.connect(useUri, { dbName: 'yarnitt-test-orders' });
  } else {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    await mongoose.connect(uri);
  }

  app = express();
  app.use(bodyParser.json());
  app.use('/api/auth', authRoutes);
  app.use('/api/orders', orderRoutes);

  // Create test users
  // Buyer
  const buyerRes = await request(app)
    .post('/api/auth/register')
    .send({ email: 'buyer@test.com', password: 'password123', name: 'Test Buyer' });
  buyerToken = buyerRes.body.accessToken;
  const buyerUser = await User.findOne({ email: 'buyer@test.com' });
  buyerId = buyerUser!._id.toString();
  buyerUser!.role = 'buyer';
  await buyerUser!.save();

  // Seller
  const sellerRes = await request(app)
    .post('/api/auth/register')
    .send({ email: 'seller@test.com', password: 'password123', name: 'Test Seller' });
  sellerToken = sellerRes.body.accessToken;
  const sellerUser = await User.findOne({ email: 'seller@test.com' });
  sellerId = sellerUser!._id.toString();
  sellerUser!.role = 'seller';
  sellerUser!.shopName = 'Test Shop';
  await sellerUser!.save();

  // Admin
  const adminRes = await request(app)
    .post('/api/auth/register')
    .send({ email: 'admin@test.com', password: 'password123', name: 'Test Admin' });
  adminToken = adminRes.body.accessToken;
  const adminUser = await User.findOne({ email: 'admin@test.com' });
  adminUser!.role = 'admin';
  await adminUser!.save();

  // Create test product
  const product = new Product({
    name: 'Test Product',
    price: 100,
    description: 'Test description',
    stock: 10,
    sold: 0,
    seller: sellerId,
  });
  await product.save();
  productId = product._id.toString();
});

afterEach(async () => {
  if (mongoose.connection.readyState === 1) {
    await Order.deleteMany({});
    // Reset product stock
    await Product.updateOne({ _id: productId }, { stock: 10, sold: 0 });
  }
});

afterAll(async () => {
  try {
    await User.deleteMany({});
    await Product.deleteMany({});
    await Order.deleteMany({});
    await mongoose.disconnect();
  } catch (e) {
    // ignore
  }
  if (mongod) {
    await mongod.stop();
  }
});

describe('Order System Tests', () => {
  describe('POST /api/orders - Create Order', () => {
    it('should create an order with valid items', async () => {
      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          items: [
            {
              product: productId,
              quantity: 2,
            },
          ],
          shippingAddress: {
            fullName: 'John Doe',
            phone: '1234567890',
            address: '123 Main St',
            city: 'Test City',
            postalCode: '12345',
            country: 'Test Country',
          },
          paymentMethod: 'mpesa',
        })
        .expect(201);

      expect(res.body.order).toBeDefined();
      expect(res.body.order.orderNumber).toMatch(/^ORD-\d{8}-\d{3}$/);
      expect(res.body.order.totalAmount).toBe(200); // 2 * 100
      expect(res.body.order.commission).toBe(20); // 10% of 200
      expect(res.body.order.sellerEarnings).toBe(180); // 200 - 20
      expect(res.body.order.status).toBe(ORDER_STATUS.PENDING);

      // Verify stock was reduced
      const product = await Product.findById(productId);
      expect(product!.stock).toBe(8); // 10 - 2
      expect(product!.sold).toBe(2);
    });

    it('should fail with insufficient stock', async () => {
      await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          items: [
            {
              product: productId,
              quantity: 20, // More than available stock
            },
          ],
          shippingAddress: {
            fullName: 'John Doe',
            phone: '1234567890',
            address: '123 Main St',
            city: 'Test City',
            country: 'Test Country',
          },
        })
        .expect(400);
    });

    it('should fail with invalid product ID', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          items: [
            {
              product: fakeId,
              quantity: 1,
            },
          ],
          shippingAddress: {
            fullName: 'John Doe',
            phone: '1234567890',
            address: '123 Main St',
            city: 'Test City',
            country: 'Test Country',
          },
        })
        .expect(400);
    });

    it('should fail without authentication', async () => {
      await request(app)
        .post('/api/orders')
        .send({
          items: [{ product: productId, quantity: 1 }],
          shippingAddress: {
            fullName: 'John Doe',
            phone: '1234567890',
            address: '123 Main St',
            city: 'Test City',
            country: 'Test Country',
          },
        })
        .expect(401);
    });
  });

  describe('GET /api/orders/buyer - Get Buyer Orders', () => {
    let orderId: string;

    beforeEach(async () => {
      // Create an order
      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          items: [{ product: productId, quantity: 1 }],
          shippingAddress: {
            fullName: 'John Doe',
            phone: '1234567890',
            address: '123 Main St',
            city: 'Test City',
            country: 'Test Country',
          },
        });
      orderId = res.body.order._id;
    });

    it('should return buyer orders', async () => {
      const res = await request(app)
        .get('/api/orders/buyer')
        .set('Authorization', `Bearer ${buyerToken}`)
        .expect(200);

      expect(res.body.orders).toBeDefined();
      expect(res.body.orders.length).toBe(1);
      expect(res.body.orders[0]._id).toBe(orderId);
    });

    it('should not return other buyers orders', async () => {
      // Create another buyer
      const anotherBuyerRes = await request(app)
        .post('/api/auth/register')
        .send({ email: 'buyer2@test.com', password: 'password123', name: 'Buyer 2' });
      const anotherBuyerToken = anotherBuyerRes.body.accessToken;

      const res = await request(app)
        .get('/api/orders/buyer')
        .set('Authorization', `Bearer ${anotherBuyerToken}`)
        .expect(200);

      expect(res.body.orders.length).toBe(0);
    });
  });

  describe('GET /api/orders/seller - Get Seller Orders', () => {
    beforeEach(async () => {
      // Create an order
      await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          items: [{ product: productId, quantity: 1 }],
          shippingAddress: {
            fullName: 'John Doe',
            phone: '1234567890',
            address: '123 Main St',
            city: 'Test City',
            country: 'Test Country',
          },
        });
    });

    it('should return seller orders with stats', async () => {
      const res = await request(app)
        .get('/api/orders/seller')
        .set('Authorization', `Bearer ${sellerToken}`)
        .expect(200);

      expect(res.body.orders).toBeDefined();
      expect(res.body.orders.length).toBe(1);
      expect(res.body.stats).toBeDefined();
      expect(res.body.stats.totalOrders).toBe(1);
      expect(res.body.stats.totalRevenue).toBe(90); // 100 - 10% commission
    });
  });

  describe('GET /api/orders/:id - Get Order by ID', () => {
    let orderId: string;

    beforeEach(async () => {
      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          items: [{ product: productId, quantity: 1 }],
          shippingAddress: {
            fullName: 'John Doe',
            phone: '1234567890',
            address: '123 Main St',
            city: 'Test City',
            country: 'Test Country',
          },
        });
      orderId = res.body.order._id;
    });

    it('should allow buyer to view their order', async () => {
      const res = await request(app)
        .get(`/api/orders/${orderId}`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .expect(200);

      expect(res.body.order).toBeDefined();
      expect(res.body.order._id).toBe(orderId);
    });

    it('should allow seller to view order for their product', async () => {
      const res = await request(app)
        .get(`/api/orders/${orderId}`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .expect(200);

      expect(res.body.order).toBeDefined();
    });

    it('should not allow other users to view order', async () => {
      const otherUserRes = await request(app)
        .post('/api/auth/register')
        .send({ email: 'other@test.com', password: 'password123', name: 'Other User' });
      const otherUserToken = otherUserRes.body.accessToken;

      await request(app)
        .get(`/api/orders/${orderId}`)
        .set('Authorization', `Bearer ${otherUserToken}`)
        .expect(403);
    });
  });

  describe('PATCH /api/orders/:id/cancel - Cancel Order', () => {
    let orderId: string;

    beforeEach(async () => {
      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          items: [{ product: productId, quantity: 2 }],
          shippingAddress: {
            fullName: 'John Doe',
            phone: '1234567890',
            address: '123 Main St',
            city: 'Test City',
            country: 'Test Country',
          },
        });
      orderId = res.body.order._id;
    });

    it('should allow buyer to cancel pending order', async () => {
      const res = await request(app)
        .patch(`/api/orders/${orderId}/cancel`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ reason: 'Changed my mind' })
        .expect(200);

      expect(res.body.order.status).toBe(ORDER_STATUS.CANCELLED);
      expect(res.body.order.cancellationReason).toBe('Changed my mind');

      // Verify stock was restored
      const product = await Product.findById(productId);
      expect(product!.stock).toBe(10); // Restored to original
      expect(product!.sold).toBe(0); // Reduced back to 0
    });

    it('should not allow cancelling shipped order', async () => {
      // First, ship the order
      const order = await Order.findById(orderId);
      order!.status = ORDER_STATUS.SHIPPED;
      await order!.save();

      await request(app)
        .patch(`/api/orders/${orderId}/cancel`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ reason: 'Changed my mind' })
        .expect(400);
    });
  });

  describe('PATCH /api/orders/:id/confirm - Confirm Order', () => {
    let orderId: string;

    beforeEach(async () => {
      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          items: [{ product: productId, quantity: 1 }],
          shippingAddress: {
            fullName: 'John Doe',
            phone: '1234567890',
            address: '123 Main St',
            city: 'Test City',
            country: 'Test Country',
          },
        });
      orderId = res.body.order._id;
    });

    it('should allow seller to confirm order', async () => {
      const res = await request(app)
        .patch(`/api/orders/${orderId}/confirm`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .expect(200);

      expect(res.body.order.status).toBe(ORDER_STATUS.CONFIRMED);
    });

    it('should not allow buyer to confirm order', async () => {
      await request(app)
        .patch(`/api/orders/${orderId}/confirm`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .expect(403);
    });
  });

  describe('PATCH /api/orders/:id/ship - Ship Order', () => {
    let orderId: string;

    beforeEach(async () => {
      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          items: [{ product: productId, quantity: 1 }],
          shippingAddress: {
            fullName: 'John Doe',
            phone: '1234567890',
            address: '123 Main St',
            city: 'Test City',
            country: 'Test Country',
          },
        });
      orderId = res.body.order._id;

      // Confirm the order first
      await request(app)
        .patch(`/api/orders/${orderId}/confirm`)
        .set('Authorization', `Bearer ${sellerToken}`);
    });

    it('should allow seller to ship order with tracking', async () => {
      const res = await request(app)
        .patch(`/api/orders/${orderId}/ship`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({ trackingNumber: 'TRACK123456' })
        .expect(200);

      expect(res.body.order.status).toBe(ORDER_STATUS.SHIPPED);
      expect(res.body.order.trackingNumber).toBe('TRACK123456');
      expect(res.body.order.estimatedDelivery).toBeDefined();
    });

    it('should fail without tracking number', async () => {
      await request(app)
        .patch(`/api/orders/${orderId}/ship`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({})
        .expect(400);
    });
  });

  describe('PATCH /api/orders/:id/confirm-delivery - Confirm Delivery', () => {
    let orderId: string;

    beforeEach(async () => {
      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          items: [{ product: productId, quantity: 1 }],
          shippingAddress: {
            fullName: 'John Doe',
            phone: '1234567890',
            address: '123 Main St',
            city: 'Test City',
            country: 'Test Country',
          },
        });
      orderId = res.body.order._id;

      // Confirm and ship the order
      await request(app)
        .patch(`/api/orders/${orderId}/confirm`)
        .set('Authorization', `Bearer ${sellerToken}`);

      await request(app)
        .patch(`/api/orders/${orderId}/ship`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({ trackingNumber: 'TRACK123' });
    });

    it('should allow buyer to confirm delivery', async () => {
      const res = await request(app)
        .patch(`/api/orders/${orderId}/confirm-delivery`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .expect(200);

      expect(res.body.order.status).toBe(ORDER_STATUS.DELIVERED);
      expect(res.body.order.deliveredAt).toBeDefined();
    });
  });

  describe('GET /api/orders/all - Get All Orders (Admin)', () => {
    beforeEach(async () => {
      await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          items: [{ product: productId, quantity: 1 }],
          shippingAddress: {
            fullName: 'John Doe',
            phone: '1234567890',
            address: '123 Main St',
            city: 'Test City',
            country: 'Test Country',
          },
        });
    });

    it('should allow admin to view all orders', async () => {
      const res = await request(app)
        .get('/api/orders/all')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.orders).toBeDefined();
      expect(res.body.orders.length).toBeGreaterThan(0);
    });

    it('should not allow non-admin to view all orders', async () => {
      await request(app)
        .get('/api/orders/all')
        .set('Authorization', `Bearer ${buyerToken}`)
        .expect(403);
    });
  });

  describe('GET /api/orders/stats - Get Order Statistics (Admin)', () => {
    beforeEach(async () => {
      await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          items: [{ product: productId, quantity: 1 }],
          shippingAddress: {
            fullName: 'John Doe',
            phone: '1234567890',
            address: '123 Main St',
            city: 'Test City',
            country: 'Test Country',
          },
        });
    });

    it('should return order statistics for admin', async () => {
      const res = await request(app)
        .get('/api/orders/stats')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.overall).toBeDefined();
      expect(res.body.overall.totalOrders).toBe(1);
      expect(res.body.overall.totalRevenue).toBe(100);
      expect(res.body.overall.totalCommission).toBe(10);
      expect(res.body.ordersByStatus).toBeDefined();
      expect(res.body.topProducts).toBeDefined();
    });

    it('should not allow non-admin to view statistics', async () => {
      await request(app)
        .get('/api/orders/stats')
        .set('Authorization', `Bearer ${buyerToken}`)
        .expect(403);
    });
  });

  describe('PATCH /api/orders/:id/refund - Refund Order (Admin)', () => {
    let orderId: string;

    beforeEach(async () => {
      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          items: [{ product: productId, quantity: 2 }],
          shippingAddress: {
            fullName: 'John Doe',
            phone: '1234567890',
            address: '123 Main St',
            city: 'Test City',
            country: 'Test Country',
          },
        });
      orderId = res.body.order._id;

      // Deliver the order
      const order = await Order.findById(orderId);
      order!.status = ORDER_STATUS.DELIVERED;
      await order!.save();
    });

    it('should allow admin to refund order', async () => {
      const res = await request(app)
        .patch(`/api/orders/${orderId}/refund`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Defective product' })
        .expect(200);

      expect(res.body.order.status).toBe(ORDER_STATUS.REFUNDED);

      // Verify stock was restored
      const product = await Product.findById(productId);
      expect(product!.stock).toBe(10); // Restored
    });

    it('should not allow non-admin to refund order', async () => {
      await request(app)
        .patch(`/api/orders/${orderId}/refund`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ reason: 'Defective product' })
        .expect(403);
    });
  });
});
