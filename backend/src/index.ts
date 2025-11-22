import path from 'path';
import fs from 'fs';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import serveIndex from 'serve-index';
import productsRouter from './routes/products';
import authRoutes from './routes/auth';

dotenv.config();

const PORT = Number(process.env.PORT || 4000);
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/yarnitt_dev';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads'); // backend/uploads

const app = express();

// CORS configuration with credentials support
app.use(
  cors({
    origin: FRONTEND_URL,
    credentials: true,
  })
);

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Ensure uploads directory exists
try {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
} catch (err) {
  console.error('Failed to create uploads directory:', err);
}

// Serve uploaded files at /uploads
// In dev we also expose an index (directory listing); in production consider disabling.
app.use(
  '/uploads',
  express.static(UPLOADS_DIR, {
    index: false,
    maxAge: process.env.NODE_ENV === 'production' ? '1d' : 0,
  })
);

if (process.env.NODE_ENV !== 'production') {
  // show directory listing in development only
  app.use('/uploads', serveIndex(UPLOADS_DIR, { icons: true }));
}

// Health check
app.get('/healthz', (_req, res) => res.json({ status: 'ok' }));

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productsRouter);

// 404 handler for unknown routes
app.use((_req, res) => {
  res.status(404).json({ 
    success: false, 
    message: 'Route not found' 
  });
});

// Enhanced error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map((e: any) => e.message);
    return res.status(400).json({ 
      success: false, 
      message: 'Validation error', 
      errors 
    });
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0];
    return res.status(400).json({ 
      success: false, 
      message: `Duplicate value for field: ${field}` 
    });
  }

  // Generic error response
  const response: any = {
    success: false,
    message: err.message || 'Internal server error',
  };

  // Include stack trace in development mode
  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack;
  }

  res.status(err.status || 500).json(response);
});

// Connect to MongoDB and start server
async function start() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');

    const server = app.listen(PORT, () => {
      console.log(`🚀 Backend listening on http://localhost:${PORT}`);
      console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
    });

    // graceful shutdown
    const shutdown = async () => {
      console.log('⏹️  Shutting down...');
      server.close();
      await mongoose.disconnect();
      console.log('👋 Disconnected from MongoDB');
      process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  } catch (err) {
    console.error('❌ Failed to start app:', err);
    process.exit(1);
  }
}

start();