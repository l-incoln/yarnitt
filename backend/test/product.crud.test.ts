import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import express from 'express';
import bodyParser from 'body-parser';
import authRoutes from '../src/routes/auth';
import productRoutes from '../src/routes/products';
import { User } from '../src/models/User';
import { Seller } from '../src/models/Seller';
import Product from '../src/models/product';
import Category from '../src/models/Category';

let mongod: MongoMemoryServer | undefined;
let app: express.Express;

beforeAll(async () => {
  const useUri = process.env.MONGO_URI;
  if (useUri) {
    // Connect to provided MongoDB (e.g., local Docker container)
    await mongoose.connect(useUri, { dbName: 'yarnitt-test-products' });
  } else {
    // Fallback to in-memory Mongo
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    await mongoose.connect(uri);
  }

  app = express();
  app.use(bodyParser.json());
  app.use('/api/auth', authRoutes);
  app.use('/api/products', productRoutes);
});

afterEach(async () => {
  // Ensure connection is ready before deleting
  if (mongoose.connection.readyState === 1) {
    await User.deleteMany({});
    await Seller.deleteMany({});
    await Product.deleteMany({});
    await Category.deleteMany({});
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

// Helper function to create approved seller with token
async function createApprovedSeller() {
  // Register seller
  const res = await request(app)
    .post('/api/auth/register/seller')
    .send({
      email: 'seller@test.com',
      password: 'test1234',
      name: 'Test Seller',
      shopName: 'Test Shop',
    });

  const token = res.body.token;
  const sellerId = res.body.seller.id;

  // Approve seller
  await Seller.findByIdAndUpdate(sellerId, { approvalStatus: 'approved' });

  return { token, sellerId };
}

// Helper function to create category
async function createCategory(name = 'Handmade') {
  const category = await Category.create({
    name,
    description: `${name} products`,
  });
  return category;
}

describe('POST /api/products', () => {
  it('creates product with approved seller', async () => {
    const { token } = await createApprovedSeller();
    const category = await createCategory();

    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${token}`)
      .send({
        categoryId: category._id,
        title: 'Test Product',
        description: 'Test product description',
        price: 100,
        stock: 10,
        images: ['image1.jpg', 'image2.jpg'],
        tags: ['handmade', 'craft'],
        ecoFriendly: true,
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.product.title).toBe('Test Product');
    expect(res.body.product.slug).toBeDefined();
  });

  it('blocks unapproved seller', async () => {
    // Register seller but don't approve
    const res1 = await request(app)
      .post('/api/auth/register/seller')
      .send({
        email: 'seller2@test.com',
        password: 'test1234',
        name: 'Test Seller 2',
        shopName: 'Test Shop 2',
      });

    const token = res1.body.token;
    const category = await createCategory();

    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${token}`)
      .send({
        categoryId: category._id,
        title: 'Test Product',
        description: 'Test product description',
        price: 100,
        stock: 10,
        images: ['image1.jpg'],
      })
      .expect(403);

    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('approved');
  });

  it('requires authentication', async () => {
    const category = await createCategory();

    const res = await request(app)
      .post('/api/products')
      .send({
        categoryId: category._id,
        title: 'Test Product',
        description: 'Test product description',
        price: 100,
        stock: 10,
        images: ['image1.jpg'],
      })
      .expect(401);

    expect(res.body.success).toBe(false);
  });

  it('validates required fields', async () => {
    const { token } = await createApprovedSeller();

    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Test Product',
        // Missing categoryId, description, price, images
      })
      .expect(400);

    expect(res.body.success).toBe(false);
  });
});

describe('GET /api/products', () => {
  it('lists products with pagination', async () => {
    const { token } = await createApprovedSeller();
    const category = await createCategory();

    // Create multiple products
    for (let i = 0; i < 5; i++) {
      await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${token}`)
        .send({
          categoryId: category._id,
          title: `Product ${i}`,
          description: 'Test description',
          price: 100 + i * 10,
          stock: 10,
          images: ['image.jpg'],
        });
    }

    const res = await request(app)
      .get('/api/products')
      .query({ page: 1, limit: 3 })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.products.length).toBe(3);
    expect(res.body.pagination.total).toBe(5);
    expect(res.body.pagination.pages).toBe(2);
  });

  it('filters by category', async () => {
    const { token } = await createApprovedSeller();
    const category1 = await createCategory('Category1');
    const category2 = await createCategory('Category2');

    // Create products in different categories
    await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${token}`)
      .send({
        categoryId: category1._id,
        title: 'Product 1',
        description: 'Test',
        price: 100,
        stock: 10,
        images: ['image.jpg'],
      });

    await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${token}`)
      .send({
        categoryId: category2._id,
        title: 'Product 2',
        description: 'Test',
        price: 200,
        stock: 10,
        images: ['image.jpg'],
      });

    const res = await request(app)
      .get('/api/products')
      .query({ category: category1._id.toString() })
      .expect(200);

    expect(res.body.success).toBe(true);
    // Debug: log if test fails
    if (res.body.products.length !== 1) {
      console.log('Products returned:', res.body.products.map((p: any) => ({ 
        title: p.title, 
        categoryId: p.categoryId._id || p.categoryId 
      })));
      console.log('Expected category:', category1._id.toString());
    }
    expect(res.body.products.length).toBe(1);
    expect(res.body.products[0].title).toBe('Product 1');
  });

  it('filters by price range', async () => {
    const { token } = await createApprovedSeller();
    const category = await createCategory();

    // Create products with different prices
    await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${token}`)
      .send({
        categoryId: category._id,
        title: 'Cheap Product',
        description: 'Test',
        price: 50,
        stock: 10,
        images: ['image.jpg'],
      });

    await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${token}`)
      .send({
        categoryId: category._id,
        title: 'Expensive Product',
        description: 'Test',
        price: 500,
        stock: 10,
        images: ['image.jpg'],
      });

    const res = await request(app)
      .get('/api/products')
      .query({ minPrice: 100, maxPrice: 600 })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.products.length).toBe(1);
    expect(res.body.products[0].title).toBe('Expensive Product');
  });
});

describe('GET /api/products/:id', () => {
  it('gets single product with seller info', async () => {
    const { token } = await createApprovedSeller();
    const category = await createCategory();

    const createRes = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${token}`)
      .send({
        categoryId: category._id,
        title: 'Test Product',
        description: 'Test description',
        price: 100,
        stock: 10,
        images: ['image.jpg'],
      });

    const productId = createRes.body.product.id;

    const res = await request(app)
      .get(`/api/products/${productId}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.product.title).toBe('Test Product');
    expect(res.body.product.sellerId).toBeDefined();
    expect(res.body.product.sellerId.shopName).toBeDefined();
  });

  it('returns 404 for non-existent product', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app)
      .get(`/api/products/${fakeId}`)
      .expect(404);

    expect(res.body.success).toBe(false);
  });
});

describe('PUT /api/products/:id', () => {
  it('updates own product', async () => {
    const { token } = await createApprovedSeller();
    const category = await createCategory();

    // Create product
    const createRes = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${token}`)
      .send({
        categoryId: category._id,
        title: 'Original Title',
        description: 'Original description',
        price: 100,
        stock: 10,
        images: ['image.jpg'],
      });

    const productId = createRes.body.product.id;

    // Update product
    const res = await request(app)
      .put(`/api/products/${productId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Updated Title',
        price: 150,
      })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.product.title).toBe('Updated Title');
    expect(res.body.product.price).toBe(150);
  });

  it('blocks updating other seller\'s product', async () => {
    const { token: token1 } = await createApprovedSeller();
    const category = await createCategory();

    // Create product with seller 1
    const createRes = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${token1}`)
      .send({
        categoryId: category._id,
        title: 'Product 1',
        description: 'Description',
        price: 100,
        stock: 10,
        images: ['image.jpg'],
      });

    const productId = createRes.body.product.id;

    // Create seller 2
    const res2 = await request(app)
      .post('/api/auth/register/seller')
      .send({
        email: 'seller2@test.com',
        password: 'test1234',
        name: 'Seller 2',
        shopName: 'Shop 2',
      });

    const token2 = res2.body.token;
    const sellerId2 = res2.body.seller.id;

    // Approve seller 2
    await Seller.findByIdAndUpdate(sellerId2, { approvalStatus: 'approved' });

    // Try to update with seller 2
    const res = await request(app)
      .put(`/api/products/${productId}`)
      .set('Authorization', `Bearer ${token2}`)
      .send({
        title: 'Hacked Title',
      })
      .expect(403);

    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('your own');
  });
});

describe('DELETE /api/products/:id', () => {
  it('deletes own product', async () => {
    const { token } = await createApprovedSeller();
    const category = await createCategory();

    // Create product
    const createRes = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${token}`)
      .send({
        categoryId: category._id,
        title: 'Product to Delete',
        description: 'Description',
        price: 100,
        stock: 10,
        images: ['image.jpg'],
      });

    const productId = createRes.body.product.id;

    // Delete product
    const res = await request(app)
      .delete(`/api/products/${productId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.success).toBe(true);

    // Verify deletion
    const product = await Product.findById(productId);
    expect(product).toBeNull();
  });

  it('blocks deleting other seller\'s product', async () => {
    const { token: token1 } = await createApprovedSeller();
    const category = await createCategory();

    // Create product with seller 1
    const createRes = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${token1}`)
      .send({
        categoryId: category._id,
        title: 'Product 1',
        description: 'Description',
        price: 100,
        stock: 10,
        images: ['image.jpg'],
      });

    const productId = createRes.body.product.id;

    // Create seller 2
    const res2 = await request(app)
      .post('/api/auth/register/seller')
      .send({
        email: 'seller2@test.com',
        password: 'test1234',
        name: 'Seller 2',
        shopName: 'Shop 2',
      });

    const token2 = res2.body.token;
    const sellerId2 = res2.body.seller.id;

    // Approve seller 2
    await Seller.findByIdAndUpdate(sellerId2, { approvalStatus: 'approved' });

    // Try to delete with seller 2
    const res = await request(app)
      .delete(`/api/products/${productId}`)
      .set('Authorization', `Bearer ${token2}`)
      .expect(403);

    expect(res.body.success).toBe(false);
  });
});
