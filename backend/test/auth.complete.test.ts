import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import express from 'express';
import bodyParser from 'body-parser';
import authRoutes from '../src/routes/auth';
import { User } from '../src/models/User';
import RefreshToken from '../src/models/RefreshToken';

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
  app.use('/api', authRoutes);
});

afterEach(async () => {
  // Ensure connection is ready before deleting
  if (mongoose.connection.readyState === 1) {
    await User.deleteMany({});
    await RefreshToken.deleteMany({});
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

describe('POST /api/auth/register-buyer', () => {
  it('returns 201 and tokens on success', async () => {
    const res = await request(app)
      .post('/api/auth/register-buyer')
      .send({ 
        email: 'buyer@example.com', 
        password: 'password123', 
        name: 'Buyer User',
        phone: '+254700000000'
      })
      .expect(201);

    expect(res.body.accessToken).toBeDefined();
    expect(res.body.refreshToken).toBeDefined();
    expect(res.body.user).toBeDefined();
    expect(res.body.user.email).toBe('buyer@example.com');
    expect(res.body.user.role).toBe('buyer');
    expect(res.body.user.password).toBeUndefined(); // Password should be excluded
  });

  it('returns 409 for duplicate email', async () => {
    await request(app)
      .post('/api/auth/register-buyer')
      .send({ 
        email: 'buyer2@example.com', 
        password: 'password123', 
        name: 'Buyer',
        phone: '+254700000000'
      })
      .expect(201);

    await request(app)
      .post('/api/auth/register-buyer')
      .send({ 
        email: 'buyer2@example.com', 
        password: 'anotherpass', 
        name: 'Buyer2',
        phone: '+254700000001'
      })
      .expect(409);
  });

  it('returns 400 for missing fields', async () => {
    await request(app)
      .post('/api/auth/register-buyer')
      .send({ 
        email: 'buyer@example.com', 
        password: 'password123'
        // Missing name and phone
      })
      .expect(400);
  });

  it('returns 400 for short password', async () => {
    await request(app)
      .post('/api/auth/register-buyer')
      .send({ 
        email: 'buyer@example.com', 
        password: 'short',
        name: 'Buyer',
        phone: '+254700000000'
      })
      .expect(400);
  });
});

describe('POST /api/auth/register-seller', () => {
  it('returns 201 and tokens with pending status', async () => {
    const res = await request(app)
      .post('/api/auth/register-seller')
      .send({ 
        email: 'seller@example.com', 
        password: 'password123', 
        name: 'Seller User',
        phone: '+254700000000',
        shopName: 'My Shop',
        bio: 'This is my shop',
        kraPin: 'A123456789X'
      })
      .expect(201);

    expect(res.body.accessToken).toBeDefined();
    expect(res.body.refreshToken).toBeDefined();
    expect(res.body.user).toBeDefined();
    expect(res.body.user.email).toBe('seller@example.com');
    expect(res.body.user.role).toBe('seller');
    expect(res.body.user.shopName).toBe('My Shop');
    expect(res.body.user.sellerStatus).toBe('pending');
    expect(res.body.message).toBe('Your shop is pending approval');
  });

  it('returns 400 when shopName is missing', async () => {
    await request(app)
      .post('/api/auth/register-seller')
      .send({ 
        email: 'seller@example.com', 
        password: 'password123', 
        name: 'Seller User',
        phone: '+254700000000'
        // Missing shopName
      })
      .expect(400);
  });
});

describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    // Create a buyer user
    await request(app)
      .post('/api/auth/register-buyer')
      .send({ 
        email: 'loginbuyer@example.com', 
        password: 'password123', 
        name: 'Login Buyer',
        phone: '+254700000000'
      });

    // Create an approved seller user
    const seller = new User({
      email: 'approvedseller@example.com',
      password: 'password123',
      name: 'Approved Seller',
      phone: '+254700000001',
      role: 'seller',
      shopName: 'Approved Shop',
      sellerStatus: 'approved'
    });
    await seller.save();
  });

  it('returns tokens for valid buyer credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ 
        email: 'loginbuyer@example.com', 
        password: 'password123'
      })
      .expect(200);

    expect(res.body.accessToken).toBeDefined();
    expect(res.body.refreshToken).toBeDefined();
    expect(res.body.user.email).toBe('loginbuyer@example.com');
  });

  it('returns 401 for invalid password', async () => {
    await request(app)
      .post('/api/auth/login')
      .send({ 
        email: 'loginbuyer@example.com', 
        password: 'wrongpassword'
      })
      .expect(401);
  });

  it('returns 401 for non-existent user', async () => {
    await request(app)
      .post('/api/auth/login')
      .send({ 
        email: 'nonexistent@example.com', 
        password: 'password123'
      })
      .expect(401);
  });

  it('returns tokens for approved seller', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ 
        email: 'approvedseller@example.com', 
        password: 'password123'
      })
      .expect(200);

    expect(res.body.accessToken).toBeDefined();
    expect(res.body.user.role).toBe('seller');
  });

  it('returns 403 for pending seller', async () => {
    // Create pending seller
    const pendingSeller = new User({
      email: 'pendingseller@example.com',
      password: 'password123',
      name: 'Pending Seller',
      phone: '+254700000002',
      role: 'seller',
      shopName: 'Pending Shop',
      sellerStatus: 'pending'
    });
    await pendingSeller.save();

    await request(app)
      .post('/api/auth/login')
      .send({ 
        email: 'pendingseller@example.com', 
        password: 'password123'
      })
      .expect(403);
  });
});

describe('POST /api/auth/logout', () => {
  it('successfully logs out with valid refresh token', async () => {
    // Register and get tokens
    const registerRes = await request(app)
      .post('/api/auth/register-buyer')
      .send({ 
        email: 'logout@example.com', 
        password: 'password123', 
        name: 'Logout User',
        phone: '+254700000000'
      });

    const { refreshToken } = registerRes.body;

    // Logout
    const res = await request(app)
      .post('/api/auth/logout')
      .send({ refreshToken })
      .expect(200);

    expect(res.body.message).toBe('Logged out successfully');

    // Verify token is deleted
    const token = await RefreshToken.findOne({ token: refreshToken });
    expect(token).toBeNull();
  });

  it('returns 400 when refresh token is missing', async () => {
    await request(app)
      .post('/api/auth/logout')
      .send({})
      .expect(400);
  });
});

describe('POST /api/auth/forgot-password', () => {
  beforeEach(async () => {
    await request(app)
      .post('/api/auth/register-buyer')
      .send({ 
        email: 'forgot@example.com', 
        password: 'password123', 
        name: 'Forgot User',
        phone: '+254700000000'
      });
  });

  it('returns reset token for valid email', async () => {
    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'forgot@example.com' })
      .expect(200);

    expect(res.body.message).toBe('Password reset link sent');
    expect(res.body.resetToken).toBeDefined();

    // Verify token is stored in database
    const user = await User.findOne({ email: 'forgot@example.com' });
    expect(user?.passwordResetToken).toBeDefined();
    expect(user?.passwordResetExpires).toBeDefined();
  });

  it('returns 200 even for non-existent email (security)', async () => {
    await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'nonexistent@example.com' })
      .expect(200);
  });
});

describe('POST /api/auth/reset-password/:token', () => {
  let resetToken: string;

  beforeEach(async () => {
    // Register and get reset token
    await request(app)
      .post('/api/auth/register-buyer')
      .send({ 
        email: 'reset@example.com', 
        password: 'oldpassword123', 
        name: 'Reset User',
        phone: '+254700000000'
      });

    const forgotRes = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'reset@example.com' });

    resetToken = forgotRes.body.resetToken;
  });

  it('successfully resets password with valid token', async () => {
    const res = await request(app)
      .post(`/api/auth/reset-password/${resetToken}`)
      .send({ password: 'newpassword123' })
      .expect(200);

    expect(res.body.message).toBe('Password reset successful');

    // Verify new password works
    await request(app)
      .post('/api/auth/login')
      .send({ 
        email: 'reset@example.com', 
        password: 'newpassword123'
      })
      .expect(200);

    // Verify old password doesn't work
    await request(app)
      .post('/api/auth/login')
      .send({ 
        email: 'reset@example.com', 
        password: 'oldpassword123'
      })
      .expect(401);
  });

  it('returns 400 for invalid token', async () => {
    await request(app)
      .post('/api/auth/reset-password/invalidtoken')
      .send({ password: 'newpassword123' })
      .expect(400);
  });

  it('returns 400 for short password', async () => {
    await request(app)
      .post(`/api/auth/reset-password/${resetToken}`)
      .send({ password: 'short' })
      .expect(400);
  });
});

describe('POST /api/auth/refresh-token', () => {
  let refreshToken: string;

  beforeEach(async () => {
    const res = await request(app)
      .post('/api/auth/register-buyer')
      .send({ 
        email: 'refresh@example.com', 
        password: 'password123', 
        name: 'Refresh User',
        phone: '+254700000000'
      });

    refreshToken = res.body.refreshToken;
  });

  it('returns new access token with valid refresh token', async () => {
    const res = await request(app)
      .post('/api/auth/refresh-token')
      .send({ refreshToken })
      .expect(200);

    expect(res.body.accessToken).toBeDefined();
    expect(typeof res.body.accessToken).toBe('string');
  });

  it('returns 400 when refresh token is missing', async () => {
    await request(app)
      .post('/api/auth/refresh-token')
      .send({})
      .expect(400);
  });

  it('returns 401 for invalid refresh token', async () => {
    await request(app)
      .post('/api/auth/refresh-token')
      .send({ refreshToken: 'invalid.token.here' })
      .expect(401);
  });

  it('returns 401 for expired/deleted refresh token', async () => {
    // Delete the refresh token
    await RefreshToken.deleteOne({ token: refreshToken });

    await request(app)
      .post('/api/auth/refresh-token')
      .send({ refreshToken })
      .expect(401);
  });
});

describe('GET /api/auth/me', () => {
  let accessToken: string;

  beforeEach(async () => {
    const res = await request(app)
      .post('/api/auth/register-buyer')
      .send({ 
        email: 'me@example.com', 
        password: 'password123', 
        name: 'Me User',
        phone: '+254700000000'
      });

    accessToken = res.body.accessToken;
  });

  it('returns user info with valid token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body.user).toBeDefined();
    expect(res.body.user.email).toBe('me@example.com');
    expect(res.body.user.name).toBe('Me User');
    expect(res.body.user.password).toBeUndefined(); // Password should be excluded
  });

  it('returns 401 when token is missing', async () => {
    await request(app)
      .get('/api/auth/me')
      .expect(401);
  });

  it('returns 401 with invalid token', async () => {
    await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer invalid.token.here')
      .expect(401);
  });
});

describe('Backwards compatibility: POST /api/auth/register', () => {
  it('still works and registers as buyer', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ 
        email: 'legacy@example.com', 
        password: 'password123', 
        name: 'Legacy User',
        phone: '+254700000000'
      })
      .expect(201);

    expect(res.body.accessToken).toBeDefined();
    expect(res.body.user.role).toBe('buyer');
  });
});
