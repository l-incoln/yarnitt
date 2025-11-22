import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IProduct extends Document {
  name: string;
  price: number;
  description?: string;
  stock: number;
  sold: number;
  seller: mongoose.Types.ObjectId;
  // add other fields used by your app here
}

const ProductSchema: Schema<IProduct> = new Schema(
  {
    name: { type: String, required: true },
    price: { type: Number, required: true },
    description: { type: String, required: false },
    stock: { type: Number, required: true, default: 0 },
    sold: { type: Number, default: 0 },
    seller: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

// Avoid OverwriteModelError during hot reloads
const Product: Model<IProduct> =
  (mongoose.models && (mongoose.models.Product as Model<IProduct>)) ||
  mongoose.model<IProduct>('Product', ProductSchema);

export default Product;
