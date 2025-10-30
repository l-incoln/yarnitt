import mongoose, { Schema, Document } from 'mongoose';

export interface IProduct extends Document { title: string; description?: string; price: number; images: string[]; createdAt: Date; }

const ProductSchema: Schema = new Schema<IProduct>({ title: { type: String, required: true }, description: { type: String }, price: { type: Number, required: true, default: 0 }, images: { type: [String], default: [] }, }, { timestamps: { createdAt: true, updatedAt: false } });

export default mongoose.models.Product || mongoose.model<IProduct>('Product', ProductSchema); EOF
