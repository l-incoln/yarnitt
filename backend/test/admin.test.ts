import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import express from 'express';
import bodyParser from 'body-parser';
import authRoutes from '../src/routes/auth';
import adminRoutes from '../src/routes/admin';
import { User } from '../src/models/User';

let mongod: MongoMemoryServer | undefined;
let app: express.Express;
let adminToken: string;
let adminUser: any;
let pendingSeller: any;

beforeAll(async () => {
  const useUri = process.env.MONGO_URI;
  if (useUri) {
    await mongoose.connect(useUri, { dbName: 'yarnitt-test' });
  } else {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    await mongoose.connect(uri);
  }

  app = express();
  app.use(bodyParser.json());
  app.use('/api', authRoutes);
  app.use('/api/admin', adminRoutes);

  // Create admin user
  adminUser = new User({
    email: 'admin@test.com',
    password: 'password123',
    name: 'Admin User',
    phone: '+254700000000',
    role: 'admin'
  });
  await adminUser.save();

  // Login as admin to get token
  const loginRes = await request(app)
    .post('/api/auth/login')
    .send({ 
      email: 'admin@test.com', 
      password: 'password123'
    });
  adminToken = loginRes.body.accessToken;
});

afterEach(async () => {
  if (mongoose.connection.readyState === 1) {
    await User.deleteMany({ role: 'seller' });
  }
});

afterAll(async () => {
  try {
    await mongoose.disconnect();
  } catch (e) {
    // ignore
  }
  if (mongod) {
    await mongod.stop();
  }
});

describe('Admin Routes - Seller Management', () => {
  beforeEach(async () => {
    // Create a pending seller for tests
    pendingSeller = new User({
      email: 'seller@test.com',
      password: 'password123',
      name: 'Test Seller',
      phone: '+254700000001',
      role: 'seller',
      shopName: 'Test Shop',
      sellerStatus: 'pending'
    });
    await pendingSeller.save();
  });

  describe('GET /api/admin/sellers', () => {
    it('returns all sellers when authenticated as admin', async () => {
      const res = await request(app)
        .get('/api/admin/sellers')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.sellers).toBeDefined();
      expect(Array.isArray(res.body.sellers)).toBe(true);
      expect(res.body.sellers.length).toBeGreaterThan(0);
      expect(res.body.sellers[0].role).toBe('seller');
      expect(res.body.sellers[0].password).toBeUndefined();
    });

    it('returns 401 when not authenticated', async () => {
      await request(app)
        .get('/api/admin/sellers')
        .expect(401);
    });

    it('returns 403 when authenticated as non-admin', async () => {
      // Register a buyer
      const buyerRes = await request(app)
        .post('/api/auth/register-buyer')
        .send({
          email: 'buyer@test.com',
          password: 'password123',
          name: 'Test Buyer',
          phone: '+254700000002'
        });

      await request(app)
        .get('/api/admin/sellers')
        .set('Authorization', `Bearer ${buyerRes.body.accessToken}`)
        .expect(403);
    });
  });

  describe('GET /api/admin/sellers/pending', () => {
    it('returns only pending sellers', async () => {
      // Create an approved seller
      const approvedSeller = new User({
        email: 'approved@test.com',
        password: 'password123',
        name: 'Approved Seller',
        phone: '+254700000003',
        role: 'seller',
        shopName: 'Approved Shop',
        sellerStatus: 'approved'
      });
      await approvedSeller.save();

      const res = await request(app)
        .get('/api/admin/sellers/pending')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.sellers).toBeDefined();
      expect(Array.isArray(res.body.sellers)).toBe(true);
      expect(res.body.sellers.every((s: any) => s.sellerStatus === 'pending')).toBe(true);
    });
  });

  describe('PUT /api/admin/sellers/:id/approve', () => {
    it('approves a pending seller', async () => {
      const res = await request(app)
        .put(`/api/admin/sellers/${pendingSeller._id}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.message).toBe('Seller approved successfully');
      expect(res.body.seller.sellerStatus).toBe('approved');

      // Verify in database
      const updatedSeller = await User.findById(pendingSeller._id);
      expect(updatedSeller?.sellerStatus).toBe('approved');
    });

    it('returns 404 for non-existent seller', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      await request(app)
        .put(`/api/admin/sellers/${fakeId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('returns 404 when trying to approve non-seller user', async () => {
      await request(app)
        .put(`/api/admin/sellers/${adminUser._id}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });

  describe('PUT /api/admin/sellers/:id/reject', () => {
    it('rejects a pending seller', async () => {
      const res = await request(app)
        .put(`/api/admin/sellers/${pendingSeller._id}/reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.message).toBe('Seller rejected successfully');
      expect(res.body.seller.sellerStatus).toBe('rejected');

      // Verify in database
      const updatedSeller = await User.findById(pendingSeller._id);
      expect(updatedSeller?.sellerStatus).toBe('rejected');
    });
  });

  describe('PUT /api/admin/sellers/:id/ban', () => {
    it('bans a seller', async () => {
      const res = await request(app)
        .put(`/api/admin/sellers/${pendingSeller._id}/ban`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.message).toBe('Seller banned successfully');
      expect(res.body.seller.sellerStatus).toBe('banned');

      // Verify in database
      const updatedSeller = await User.findById(pendingSeller._id);
      expect(updatedSeller?.sellerStatus).toBe('banned');
    });
  });
});

describe('Middleware - requireSellerApproved', () => {
  it('allows approved sellers to access protected routes', async () => {
    // This would be tested with actual protected routes that use requireSellerApproved
    // For now, we verify the seller can login when approved
    const seller = new User({
      email: 'approved.seller@test.com',
      password: 'password123',
      name: 'Approved Seller',
      phone: '+254700000010',
      role: 'seller',
      shopName: 'Approved Shop',
      sellerStatus: 'approved'
    });
    await seller.save();

    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'approved.seller@test.com',
        password: 'password123'
      })
      .expect(200);

    expect(res.body.accessToken).toBeDefined();
  });

  it('blocks unapproved sellers from logging in', async () => {
    const seller = new User({
      email: 'pending.seller@test.com',
      password: 'password123',
      name: 'Pending Seller',
      phone: '+254700000011',
      role: 'seller',
      shopName: 'Pending Shop',
      sellerStatus: 'pending'
    });
    await seller.save();

    await request(app)
      .post('/api/auth/login')
      .send({
        email: 'pending.seller@test.com',
        password: 'password123'
      })
      .expect(403);
  });
});
