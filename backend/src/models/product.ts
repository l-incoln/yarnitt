import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface IProduct extends Document {
  sellerId: Types.ObjectId;
  categoryId: Types.ObjectId;
  title: string;
  slug: string;
  description: string;
  materials?: string;
  sustainabilityNotes?: string;
  price: number;
  compareAtPrice?: number;
  stock: number;
  images: string[];
  thumbnailImage: string;
  isActive: boolean;
  isFeatured: boolean;
  isBoosted: boolean;
  boostedUntil?: Date;
  tags: string[];
  ecoFriendly: boolean;
  customizationOptions?: string;
  estimatedDeliveryDays?: number;
  views: number;
  soldCount: number;
  rating: number;
  reviewCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema: Schema<IProduct> = new Schema(
  {
    sellerId: {
      type: Schema.Types.ObjectId,
      ref: 'Seller',
      required: [true, 'Seller ID is required'],
    },
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'Category ID is required'],
    },
    title: {
      type: String,
      required: [true, 'Product title is required'],
      trim: true,
    },
    slug: {
      type: String,
      unique: true,
      trim: true,
      lowercase: true,
    },
    description: {
      type: String,
      required: [true, 'Product description is required'],
      trim: true,
    },
    materials: {
      type: String,
      trim: true,
    },
    sustainabilityNotes: {
      type: String,
      trim: true,
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price cannot be negative'],
    },
    compareAtPrice: {
      type: Number,
      min: [0, 'Compare at price cannot be negative'],
    },
    stock: {
      type: Number,
      required: [true, 'Stock is required'],
      min: [0, 'Stock cannot be negative'],
      default: 0,
    },
    images: {
      type: [String],
      required: [true, 'At least one image is required'],
      validate: {
        validator: function (v: string[]) {
          return v && v.length > 0;
        },
        message: 'At least one image is required',
      },
    },
    thumbnailImage: {
      type: String,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    isBoosted: {
      type: Boolean,
      default: false,
    },
    boostedUntil: {
      type: Date,
    },
    tags: {
      type: [String],
      default: [],
    },
    ecoFriendly: {
      type: Boolean,
      default: false,
    },
    customizationOptions: {
      type: String,
      trim: true,
    },
    estimatedDeliveryDays: {
      type: Number,
      min: [1, 'Estimated delivery days must be at least 1'],
    },
    views: {
      type: Number,
      default: 0,
      min: [0, 'Views cannot be negative'],
    },
    soldCount: {
      type: Number,
      default: 0,
      min: [0, 'Sold count cannot be negative'],
    },
    rating: {
      type: Number,
      default: 0,
      min: [0, 'Rating cannot be less than 0'],
      max: [5, 'Rating cannot be more than 5'],
    },
    reviewCount: {
      type: Number,
      default: 0,
      min: [0, 'Review count cannot be negative'],
    },
  },
  { timestamps: true }
);

// Text search index
ProductSchema.index({ title: 'text', description: 'text', tags: 'text' });

// Indexes for filtering and sorting
ProductSchema.index({ price: 1 });
ProductSchema.index({ createdAt: -1 });
ProductSchema.index({ isActive: 1 });
ProductSchema.index({ isFeatured: 1 });
ProductSchema.index({ isBoosted: 1 });
ProductSchema.index({ ecoFriendly: 1 });

// Auto-generate slug from title with timestamp suffix before saving
ProductSchema.pre('save', function (next) {
  if (this.isModified('title') || !this.slug) {
    const baseSlug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    this.slug = `${baseSlug}-${Date.now()}`;
  }
  
  // Auto-set thumbnail from first image
  if (this.images && this.images.length > 0 && !this.thumbnailImage) {
    this.thumbnailImage = this.images[0];
  }
  
  next();
});

// Avoid OverwriteModelError during hot reloads
const Product: Model<IProduct> =
  (mongoose.models && (mongoose.models.Product as Model<IProduct>)) ||
  mongoose.model<IProduct>('Product', ProductSchema);

export default Product;
