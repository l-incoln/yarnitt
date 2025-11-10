#!/usr/bin/env bash
set -euo pipefail

# Run from repository root. This script creates/upserts the backend files described.
# Usage:
#   chmod +x apply_backend_changes.sh
#   ./apply_backend_changes.sh

echo "Creating directories..."
mkdir -p backend/src/models
mkdir -p backend/src/routes
mkdir -p backend/src/middleware
mkdir -p backend/src/utils
mkdir -p backend/scripts
mkdir -p backend/uploads

echo "Writing backend/package.json..."
cat > backend/package.json <<'JSON'
{
  "name": "backend",
  "version": "1.0.0",
  "scripts": {
    "dev": "ts-node-dev --respawn --transpile-only src/index.ts",
    "start": "node dist/index.js",
    "start:dev": "ts-node-dev --respawn --transpile-only src/index.ts",
    "build": "tsc",
    "test": "jest --runInBand",
    "lint": "eslint \"src/**/*.ts\" --ext .ts",
    "typecheck": "tsc --noEmit",
    "format:check": "prettier --check \"src/**/*.ts\""
  },
  "dependencies": {
    "bcryptjs": "^2.4.3",
    "express": "^4.18.2",
    "jsonwebtoken": "^9.0.0",
    "mongoose": "^7.0.0",
    "multer": "^1.4.5-lts.1"
  },
  "devDependencies": {
    "@eslint/eslintrc": "^3.3.1",
    "@types/bcrypt": "^6.0.0",
    "@types/bcryptjs": "^2.4.6",
    "@types/express": "^4.17.17",
    "@types/jest": "^29.2.5",
    "@types/jsonwebtoken": "^9.0.10",
    "@types/mongoose": "^5.11.96",
    "@types/supertest": "^2.0.12",
    "@typescript-eslint/eslint-plugin": "^8.46.3",
    "@typescript-eslint/parser": "^8.46.3",
    "eslint": "^9.39.1",
    "jest": "^29.4.0",
    "mongodb-memory-server": "^8.12.1",
    "supertest": "^6.3.3",
    "ts-jest": "^29.0.0",
    "ts-node-dev": "^2.0.0",
    "typescript": "^5.2.0"
  }
}
JSON

echo "Writing docker-compose.override.yml..."
cat > docker-compose.override.yml <<'YAML'
version: "3.8"
services:
  mongo:
    image: mongo:6
    ports:
      - "27017:27017"
    volumes:
      - mongo-data:/data/db

  backend:
    build:
      context: .
      dockerfile: ./backend/Dockerfile
    environment:
      - MONGO_URI=mongodb://mongo:27017/yarnitt
      - NODE_ENV=development
      - PORT=4000
    ports:
      - "4000:4000"
    depends_on:
      - mongo

volumes:
  mongo-data:
YAML

echo "Writing .dockerignore..."
cat > .dockerignore <<'DOCKERIGNORE'
node_modules
.git
dist
coverage
*.log
.env
DOCKERIGNORE

echo "Writing backend/src/index.ts..."
cat > backend/src/index.ts <<'TS'
import path from 'path';
import fs from 'fs';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import serveIndex from 'serve-index';

import productsRouter from './routes/products';
import authRoutes from './routes/auth';
import sellerRouter from './routes/seller';
import ordersRouter from './routes/orders';
import paymentRouter from './routes/payments';

dotenv.config();

const PORT = Number(process.env.PORT || 4000);
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/yarnitt_dev';
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads'); // backend/uploads

const app = express();

// Basic middleware
app.use(cors());
app.use(express.json());

// Ensure uploads directory exists
try {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
} catch (err) {
  console.error('Failed to create uploads directory:', err);
}

// Serve uploaded files at /uploads
app.use(
  '/uploads',
  express.static(UPLOADS_DIR, {
    index: false,
    maxAge: process.env.NODE_ENV === 'production' ? '1d' : 0,
  })
);

if (process.env.NODE_ENV !== 'production') {
  app.use('/uploads', serveIndex(UPLOADS_DIR, { icons: true }));
}

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/products', productsRouter); // public product listing
app.use('/api/seller', sellerRouter); // seller-protected endpoints
app.use('/api/orders', ordersRouter); // order creation (buyer)
app.use('/api/payments', paymentRouter); // callbacks/handlers

// Health check
app.get('/healthz', (_req, res) => res.json({ status: 'ok' }));

// Generic error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ message: 'Internal server error' });
});

// Connect to MongoDB and start server
async function start() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    const server = app.listen(PORT, () => {
      console.log(`Backend listening on http://localhost:${PORT}`);
    });

    // graceful shutdown
    const shutdown = async () => {
      console.log('Shutting down...');
      server.close();
      await mongoose.disconnect();
      process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  } catch (err) {
    console.error('Failed to start app:', err);
    process.exit(1);
  }
}

start();
TS

echo "Writing models..."
cat > backend/src/models/User.ts <<'USER'
import mongoose, { Schema, Document } from 'mongoose';

export type Role = 'BUYER' | 'SELLER' | 'ADMIN';

export interface IUser extends Document {
  email: string;
  passwordHash: string;
  name?: string;
  phone?: string;
  role: Role;
  createdAt: Date;
}

const UserSchema: Schema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, index: true },
    passwordHash: { type: String, required: true },
    name: { type: String },
    phone: { type: String },
    role: { type: String, enum: ['BUYER', 'SELLER', 'ADMIN'], default: 'BUYER' },
  },
  { timestamps: true }
);

const User = mongoose.model<IUser>('User', UserSchema);
export default User;
USER

cat > backend/src/models/SellerProfile.ts <<'SELLER'
import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ISellerProfile extends Document {
  user: Types.ObjectId;
  shopName: string;
  bio?: string;
  kraPin?: string;
  logoUrl?: string;
  bannerUrl?: string;
  approved: boolean;
  salesCount: number;
  totalEarnings: number;
  createdAt: Date;
}

const SellerProfileSchema: Schema = new Schema<ISellerProfile>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    shopName: { type: String, required: true, index: true },
    bio: { type: String },
    kraPin: { type: String },
    logoUrl: { type: String },
    bannerUrl: { type: String },
    approved: { type: Boolean, default: false },
    salesCount: { type: Number, default: 0 },
    totalEarnings: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const SellerProfile = mongoose.model<ISellerProfile>('SellerProfile', SellerProfileSchema);
export default SellerProfile;
SELLER

cat > backend/src/models/Product.ts <<'PRODUCT'
import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IProductImage {
  url: string;
  altText?: string;
  order?: number;
}

export interface IProduct extends Document {
  title: string;
  slug: string;
  description?: string;
  priceCents: number;
  currency?: string;
  stock: number;
  ecoFriendly?: boolean;
  upcycled?: boolean;
  materials?: string;
  seller: Types.ObjectId;
  category?: string;
  images: IProductImage[];
  tags: string[];
  boosted?: boolean;
  isActive?: boolean;
  createdAt: Date;
}

const ProductImageSchema = new Schema<IProductImage>({
  url: { type: String, required: true },
  altText: { type: String },
  order: { type: Number, default: 0 },
});

const ProductSchema: Schema = new Schema<IProduct>(
  {
    title: { type: String, required: true, index: true },
    slug: { type: String, required: true, unique: true, index: true },
    description: { type: String },
    priceCents: { type: Number, required: true },
    currency: { type: String, default: 'KES' },
    stock: { type: Number, default: 0 },
    ecoFriendly: { type: Boolean, default: false },
    upcycled: { type: Boolean, default: false },
    materials: { type: String },
    seller: { type: Schema.Types.ObjectId, ref: 'SellerProfile', required: true },
    category: { type: String },
    images: { type: [ProductImageSchema], default: [] },
    tags: { type: [String], default: [] },
    boosted: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const Product = mongoose.model<IProduct>('Product', ProductSchema);
export default Product;
PRODUCT

cat > backend/src/models/Order.ts <<'ORDER'
import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IOrderItem {
  product: Types.ObjectId;
  title: string;
  priceCents: number;
  quantity: number;
}

export interface IOrder extends Document {
  buyer: Types.ObjectId;
  items: IOrderItem[];
  subtotalCents: number;
  shippingCents: number;
  totalCents: number;
  currency?: string;
  status: 'PENDING' | 'PAID' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | 'REFUNDED';
  shippingAddress?: any;
  createdAt: Date;
}

const OrderItemSchema = new Schema<IOrderItem>({
  product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  title: { type: String },
  priceCents: { type: Number, required: true },
  quantity: { type: Number, required: true },
});

const OrderSchema: Schema = new Schema<IOrder>(
  {
    buyer: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    items: { type: [OrderItemSchema], required: true },
    subtotalCents: { type: Number, required: true },
    shippingCents: { type: Number, default: 0 },
    totalCents: { type: Number, required: true },
    currency: { type: String, default: 'KES' },
    status: { type: String, default: 'PENDING' },
    shippingAddress: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

const Order = mongoose.model<IOrder>('Order', OrderSchema);
export default Order;
ORDER

cat > backend/src/models/Payment.ts <<'PAYMENT'
import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IPayment extends Document {
  order?: Types.ObjectId;
  user: Types.ObjectId;
  provider: string;
  providerId?: string;
  amountCents: number;
  currency?: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  rawResponse?: Record<string, any>;
  createdAt: Date;
}

const PaymentSchema: Schema = new Schema<IPayment>(
  {
    order: { type: Schema.Types.ObjectId, ref: 'Order' },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    provider: { type: String, required: true },
    providerId: { type: String, index: true, unique: false, sparse: true },
    amountCents: { type: Number, required: true },
    currency: { type: String, default: 'KES' },
    status: { type: String, default: 'PENDING' },
    rawResponse: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

const Payment = mongoose.model<IPayment>('Payment', PaymentSchema);
export default Payment;
PAYMENT

echo "Writing utils and middleware..."
cat > backend/src/utils/jwt.ts <<'JWT'
import jwt from 'jsonwebtoken';

const ACCESS_EXPIRY = '1h';
const REFRESH_EXPIRY = '7d';

export function signTokens(user: { id: string; role?: string }) {
  const payload = { userId: user.id, role: user.role || 'BUYER' };
  const accessToken = jwt.sign(payload, process.env.JWT_SECRET || 'change-me', { expiresIn: ACCESS_EXPIRY });
  const refreshToken = jwt.sign({ userId: user.id }, process.env.JWT_REFRESH_SECRET || 'change-refresh', { expiresIn: REFRESH_EXPIRY });
  return { accessToken, refreshToken };
}
JWT

cat > backend/src/middleware/auth.ts <<'AUTH'
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  user?: any;
}

export function requireAuth(role?: string) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const header = req.headers.authorization;
    if (!header) return res.status(401).json({ error: 'No auth header' });
    const token = header.split(' ')[1];
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET || 'change-me') as any;
      req.user = payload;
      if (role && payload.role !== role && payload.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Forbidden' });
      }
      next();
    } catch (err) {
      return res.status(401).json({ error: 'Invalid token' });
    }
  };
}
AUTH

echo "Writing routes/auth.ts..."
cat > backend/src/routes/auth.ts <<'AUTHROUTES'
import express from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/User';
import SellerProfile from '../models/SellerProfile';
import { signTokens } from '../utils/jwt';

const router = express.Router();

// Register buyer
router.post('/register', async (req, res) => {
  const { email, password, name, phone } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  const existing = await User.findOne({ email });
  if (existing) return res.status(400).json({ error: 'Email already registered' });

  const hash = await bcrypt.hash(password, 10);
  const user = await User.create({ email, passwordHash: hash, name, phone, role: 'BUYER' });
  const tokens = signTokens({ id: user._id.toString(), role: user.role });
  res.json({ user: { id: user._id, email: user.email, name: user.name }, tokens });
});

// Register seller (creates user + seller profile pending approval)
router.post('/register-seller', async (req, res) => {
  const { email, password, name, phone, shopName, bio, kraPin } = req.body;
  if (!email || !password || !shopName) return res.status(400).json({ error: 'email, password and shopName required' });
  const existing = await User.findOne({ email });
  if (existing) return res.status(400).json({ error: 'Email already registered' });

  const hash = await bcrypt.hash(password, 10);
  const user = await User.create({ email, passwordHash: hash, name, phone, role: 'SELLER' });
  const seller = await SellerProfile.create({ user: user._id, shopName, bio, kraPin, approved: false });
  const tokens = signTokens({ id: user._id.toString(), role: user.role });
  res.json({ user: { id: user._id, email: user.email, role: user.role }, sellerId: seller._id, tokens });
});

// Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  const user = await User.findOne({ email });
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) return res.status(401).json({ error: 'Invalid credentials' });

  const tokens = signTokens({ id: user._id.toString(), role: user.role });
  res.json({ user: { id: user._id, email: user.email, role: user.role }, tokens });
});

export default router;
AUTHROUTES

echo "Writing routes/products.ts..."
cat > backend/src/routes/products.ts <<'PRODR'
import express from 'express';
import Product from '../models/Product';

const router = express.Router();

// GET /products?q=&page=&limit=
router.get('/', async (req, res) => {
  const { q, page = '1', limit = '12', tag, eco } = req.query;
  const pageNum = Math.max(1, parseInt(page as string, 10));
  const take = Math.min(100, parseInt(limit as string, 10));

  const where: any = { isActive: true };
  if (q) {
    where.$or = [{ title: new RegExp(String(q), 'i') }, { description: new RegExp(String(q), 'i') }];
  }
  if (tag) where.tags = { $in: [String(tag)] };
  if (eco) where.ecoFriendly = eco === 'true';

  const [items, total] = await Promise.all([
    Product.find(where).populate('seller').skip((pageNum - 1) * take).limit(take).lean(),
    Product.countDocuments(where),
  ]);

  res.json({ data: items, meta: { page: pageNum, limit: take, total } });
});

// GET /products/:id
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  const product = await Product.findById(id).populate('seller');
  if (!product) return res.status(404).json({ error: 'Not found' });
  res.json(product);
});

export default router;
PRODR

echo "Writing routes/seller.ts..."
cat > backend/src/routes/seller.ts <<'SELLERR'
import express from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import Product from '../models/Product';
import SellerProfile from '../models/SellerProfile';
import { Types } from 'mongoose';

const router = express.Router();

// Middleware: require seller
router.use(requireAuth('SELLER'));

// GET seller profile (based on req.user.userId)
router.get('/me', async (req: AuthRequest, res) => {
  const userId = req.user.userId;
  const seller = await SellerProfile.findOne({ user: userId });
  res.json(seller);
});

// POST /api/seller/products
router.post('/products', async (req: AuthRequest, res) => {
  const userId = req.user.userId;
  const seller = await SellerProfile.findOne({ user: userId });
  if (!seller) return res.status(403).json({ error: 'Seller profile not found' });

  const { title, slug, description, priceCents, stock = 0, tags = [], images = [], ecoFriendly = false } = req.body;
  const product = await Product.create({
    title,
    slug,
    description,
    priceCents,
    stock,
    tags,
    images,
    ecoFriendly,
    seller: seller._id,
  });
  res.json(product);
});

// PUT /api/seller/products/:id
router.put('/products/:id', async (req: AuthRequest, res) => {
  const userId = req.user.userId;
  const seller = await SellerProfile.findOne({ user: userId });
  if (!seller) return res.status(403).json({ error: 'Seller profile not found' });

  const { id } = req.params;
  const updates = req.body;
  const product = await Product.findOneAndUpdate({ _id: id, seller: seller._id }, updates, { new: true });
  if (!product) return res.status(404).json({ error: 'Product not found or not owned' });
  res.json(product);
});

// DELETE /api/seller/products/:id
router.delete('/products/:id', async (req: AuthRequest, res) => {
  const userId = req.user.userId;
  const seller = await SellerProfile.findOne({ user: userId });
  if (!seller) return res.status(403).json({ error: 'Seller profile not found' });

  const { id } = req.params;
  const product = await Product.findOneAndUpdate({ _id: id, seller: seller._id }, { isActive: false }, { new: true });
  if (!product) return res.status(404).json({ error: 'Product not found or not owned' });
  res.json({ ok: true });
});

export default router;
SELLERR

echo "Writing routes/orders.ts..."
cat > backend/src/routes/orders.ts <<'ORDERS'
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
ORDERS

echo "Writing routes/payments.ts..."
cat > backend/src/routes/payments.ts <<'PAYMENTS'
import express from 'express';
import Payment from '../models/Payment';
import Order from '../models/Order';

const router = express.Router();

// MPesa callback (POST)
router.post('/mpesa/callback', async (req, res) => {
  // Note: adapt parsing to your MPesa provider payload
  const body = req.body;
  try {
    const providerId = body?.Body?.stkCallback?.CheckoutRequestID || body?.providerId;
    const resultCode = body?.Body?.stkCallback?.ResultCode;
    const success = resultCode === 0;

    if (!providerId) {
      // can't correlate
      return res.status(400).json({ received: false });
    }

    // idempotent update: find payment with providerId or create mapping if your system stores providerId elsewhere.
    const payment = await Payment.findOne({ providerId });
    if (!payment) {
      // optionally log unknown provider callback
      console.warn('Unknown payment callback for', providerId);
      return res.json({ received: true });
    }

    const status = success ? 'SUCCESS' : 'FAILED';
    await Payment.findByIdAndUpdate(payment._id, { status, rawResponse: body });

    if (success && payment.order) {
      await Order.findByIdAndUpdate(payment.order, { status: 'PAID' });
    }

    res.json({ received: true });
  } catch (err) {
    console.error('mpesa callback error', err);
    res.status(500).json({ error: 'error processing callback' });
  }
});

// PayPal success/cancel placeholders
router.get('/paypal/success', async (req, res) => {
  // Validate PayPal payload here
  res.json({ ok: true });
});

router.get('/paypal/cancel', async (req, res) => {
  res.json({ ok: true });
});

export default router;
PAYMENTS

echo "Writing backend/scripts/seed.ts..."
cat > backend/scripts/seed.ts <<'SEED'
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import User from '../src/models/User';
import SellerProfile from '../src/models/SellerProfile';
import Product from '../src/models/Product';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/yarnitt';

async function seed() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to Mongo for seeding');

  // create admin
  const adminEmail = 'admin@yarnitt.test';
  let admin = await User.findOne({ email: adminEmail });
  if (!admin) {
    const hash = await bcrypt.hash('adminpass', 10);
    admin = await User.create({ email: adminEmail, passwordHash: hash, name: 'Admin', role: 'ADMIN' });
    console.log('Created admin', adminEmail);
  }

  // create seller
  const sellerEmail = 'seller@yarnitt.test';
  let sellerUser = await User.findOne({ email: sellerEmail });
  if (!sellerUser) {
    const hash = await bcrypt.hash('sellerpass', 10);
    sellerUser = await User.create({ email: sellerEmail, passwordHash: hash, name: 'Seller', role: 'SELLER' });
    console.log('Created seller user', sellerEmail);
  }

  let sellerProfile = await SellerProfile.findOne({ user: sellerUser._id });
  if (!sellerProfile) {
    sellerProfile = await SellerProfile.create({ user: sellerUser._id, shopName: 'Sample Shop', approved: true });
    console.log('Created seller profile');
  }

  // sample product
  const productSlug = 'sample-yarn';
  let product = await Product.findOne({ slug: productSlug });
  if (!product) {
    product = await Product.create({
      title: 'Sample Yarn',
      slug: productSlug,
      description: 'Soft eco-friendly yarn',
      priceCents: 1200,
      stock: 10,
      seller: sellerProfile._id,
      tags: ['eco', 'handmade'],
      images: [{ url: '/uploads/sample.jpg', altText: 'sample' }],
    });
    console.log('Created sample product');
  }

  console.log('Seeding complete');
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('Seeding error', err);
  process.exit(1);
});
SEED

echo "All files written. You should now run (from repo root):"
echo "  1) Start Mongo locally: docker run -d --name local-mongo -p 27017:27017 mongo:6 --replSet rs0"
echo "     then initialize replica set: docker exec -it local-mongo mongosh --eval \"rs.initiate()\""
echo "  2) In backend/: npm install"
echo "  3) Create .env: cp .env.template .env and set MONGO_URI if needed"
echo "  4) Start dev server: npm run dev (from backend/)"
echo "  5) Seed sample data: npx ts-node backend/scripts/seed.ts"
echo
echo "Note: If you want to run via docker compose, run from repo root:"
echo "  docker compose -f docker-compose.yml -f docker-compose.override.yml up -d --build"
