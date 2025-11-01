import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IProduct extends Document {
  name: string;
  price: number;
  description?: string;
  // add other fields used by your app here
}

const ProductSchema: Schema<IProduct> = new Schema(
  {
    name: { type: String, required: true },
    price: { type: Number, required: true },
    description: { type: String, required: false },
  },
  { timestamps: true }
);

// Avoid OverwriteModelError during hot reloads
const Product: Model<IProduct> =
  (mongoose.models && (mongoose.models.Product as Model<IProduct>)) ||
  mongoose.model<IProduct>('Product', ProductSchema);

export default Product;
