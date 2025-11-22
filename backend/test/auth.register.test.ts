import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import express from 'express';
import bodyParser from 'body-parser';
import authRoutes from '../src/routes/auth';
import { User } from '../src/models/User';

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

describe('POST /api/auth/register', () => {
  it('returns 201 and tokens on success', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'alice@example.com', password: 'password123', name: 'Alice' })
      .expect(201);

    expect(res.body.accessToken).toBeDefined();
    expect(res.body.refreshToken).toBeDefined();
  });

  it('returns 409 for duplicate email', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ email: 'bob@example.com', password: 'password123', name: 'Bob' })
      .expect(201);

    await request(app)
      .post('/api/auth/register')
      .send({ email: 'bob@example.com', password: 'anotherpass', name: 'Bob2' })
      .expect(409);
  });

  it('returns 400 for invalid input', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ email: 'invalid-email', password: 'short' })
      .expect(400);
  });
});