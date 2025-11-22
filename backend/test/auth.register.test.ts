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

describe('POST /api/auth/register/buyer', () => {
  it('returns 201 and token on success', async () => {
    const res = await request(app)
      .post('/api/auth/register/buyer')
      .send({ email: 'alice@example.com', password: 'password123', name: 'Alice' })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.role).toBe('buyer');
  });

  it('returns 400 for duplicate email', async () => {
    await request(app)
      .post('/api/auth/register/buyer')
      .send({ email: 'bob@example.com', password: 'password123', name: 'Bob' })
      .expect(201);

    const res = await request(app)
      .post('/api/auth/register/buyer')
      .send({ email: 'bob@example.com', password: 'anotherpass', name: 'Bob2' })
      .expect(400);

    expect(res.body.success).toBe(false);
  });

  it('returns 400 for missing fields', async () => {
    const res = await request(app)
      .post('/api/auth/register/buyer')
      .send({ email: 'test@example.com' })
      .expect(400);

    expect(res.body.success).toBe(false);
  });
});