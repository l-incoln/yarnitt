import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import express from 'express';
import bodyParser from 'body-parser';
import authRoutes from '../src/routes/auth';
import { User } from '../src/models/User';
import { Seller } from '../src/models/Seller';

let mongod: MongoMemoryServer | undefined;
let app: express.Express;

beforeAll(async () => {
  const useUri = process.env.MONGO_URI;
  if (useUri) {
    // Connect to provided MongoDB (e.g., local Docker container)
    await mongoose.connect(useUri, { dbName: 'yarnitt-test' });
  } else {
    // Fallback to in-memory Mongo
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    await mongoose.connect(uri);
  }

  app = express();
  app.use(bodyParser.json());
  app.use('/api/auth', authRoutes);
});

afterEach(async () => {
  // Ensure connection is ready before deleting
  if (mongoose.connection.readyState === 1) {
    await User.deleteMany({});
    await Seller.deleteMany({});
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

describe('POST /api/auth/register/seller', () => {
  it('returns 201 and creates seller profile', async () => {
    const res = await request(app)
      .post('/api/auth/register/seller')
      .send({
        email: 'seller@example.com',
        password: 'password123',
        name: 'Test Seller',
        shopName: 'Test Shop',
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.role).toBe('seller');
    expect(res.body.seller.shopName).toBe('Test Shop');
    expect(res.body.seller.approvalStatus).toBe('pending');
  });

  it('returns 400 for duplicate shop name', async () => {
    await request(app)
      .post('/api/auth/register/seller')
      .send({
        email: 'seller1@example.com',
        password: 'password123',
        name: 'Test Seller 1',
        shopName: 'Duplicate Shop',
      })
      .expect(201);

    const res = await request(app)
      .post('/api/auth/register/seller')
      .send({
        email: 'seller2@example.com',
        password: 'password123',
        name: 'Test Seller 2',
        shopName: 'Duplicate Shop',
      })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Shop name already taken');
  });
});

describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    // Create a test buyer
    await request(app)
      .post('/api/auth/register/buyer')
      .send({
        email: 'buyer@example.com',
        password: 'password123',
        name: 'Test Buyer',
      });
  });

  it('returns 200 and token on valid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'buyer@example.com',
        password: 'password123',
      })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe('buyer@example.com');
  });

  it('returns 401 on invalid password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'buyer@example.com',
        password: 'wrongpassword',
      })
      .expect(401);

    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Invalid credentials');
  });

  it('returns 401 for non-existent user', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'nonexistent@example.com',
        password: 'password123',
      })
      .expect(401);

    expect(res.body.success).toBe(false);
  });
});

describe('GET /api/auth/me', () => {
  let token: string;

  beforeEach(async () => {
    const res = await request(app)
      .post('/api/auth/register/buyer')
      .send({
        email: 'buyer@example.com',
        password: 'password123',
        name: 'Test Buyer',
      });

    token = res.body.token;
  });

  it('returns user data with valid token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.user.email).toBe('buyer@example.com');
    expect(res.body.user.name).toBe('Test Buyer');
  });

  it('returns 401 without token', async () => {
    const res = await request(app).get('/api/auth/me').expect(401);

    expect(res.body.success).toBe(false);
  });

  it('returns 401 with invalid token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer invalid_token')
      .expect(401);

    expect(res.body.success).toBe(false);
  });
});

describe('POST /api/auth/forgot-password', () => {
  beforeEach(async () => {
    await request(app)
      .post('/api/auth/register/buyer')
      .send({
        email: 'buyer@example.com',
        password: 'password123',
        name: 'Test Buyer',
      });
  });

  it('returns success message', async () => {
    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({
        email: 'buyer@example.com',
      })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.message).toContain('password reset link');
  });

  it('returns success even for non-existent email (security)', async () => {
    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({
        email: 'nonexistent@example.com',
      })
      .expect(200);

    expect(res.body.success).toBe(true);
  });
});

describe('GET /api/auth/verify-token', () => {
  let token: string;

  beforeEach(async () => {
    const res = await request(app)
      .post('/api/auth/register/buyer')
      .send({
        email: 'buyer@example.com',
        password: 'password123',
        name: 'Test Buyer',
      });

    token = res.body.token;
  });

  it('returns valid true for valid token', async () => {
    const res = await request(app)
      .get('/api/auth/verify-token')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.valid).toBe(true);
    expect(res.body.user).toBeDefined();
  });

  it('returns valid false for invalid token', async () => {
    const res = await request(app)
      .get('/api/auth/verify-token')
      .set('Authorization', 'Bearer invalid_token')
      .expect(200);

    expect(res.body.valid).toBe(false);
  });

  it('returns valid false without token', async () => {
    const res = await request(app).get('/api/auth/verify-token').expect(200);

    expect(res.body.valid).toBe(false);
  });
});
