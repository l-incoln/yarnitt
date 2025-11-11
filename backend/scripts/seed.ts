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
