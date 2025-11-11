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
