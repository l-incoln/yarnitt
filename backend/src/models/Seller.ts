import { Schema, model, Document, Types } from 'mongoose';

export interface ISeller extends Document {
  userId: Types.ObjectId;
  shopName: string;
  bio?: string;
  kraPin?: string;
  logo?: string;
  banner?: string;
  approvalStatus: 'pending' | 'approved' | 'rejected' | 'banned';
  approvedAt?: Date;
  rejectionReason?: string;
  rating: number;
  totalSales: number;
  totalOrders: number;
  badges: string[];
  valueTags: ('Sustainability' | 'Inclusivity' | 'Community' | 'Creativity' | 'Well-being' | 'Innovation' | 'Collaboration' | 'Empowerment')[];
  socialLinks: {
    instagram?: string;
    facebook?: string;
    twitter?: string;
    website?: string;
  };
  bankDetails: {
    bankName?: string;
    accountNumber?: string;
    accountName?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const SellerSchema = new Schema<ISeller>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      unique: true,
    },
    shopName: {
      type: String,
      required: [true, 'Shop name is required'],
      unique: true,
      trim: true,
    },
    bio: {
      type: String,
      trim: true,
      maxlength: [500, 'Bio cannot exceed 500 characters'],
    },
    kraPin: {
      type: String,
      trim: true,
    },
    logo: {
      type: String,
    },
    banner: {
      type: String,
    },
    approvalStatus: {
      type: String,
      enum: {
        values: ['pending', 'approved', 'rejected', 'banned'],
        message: 'Approval status must be pending, approved, rejected, or banned',
      },
      default: 'pending',
    },
    approvedAt: {
      type: Date,
    },
    rejectionReason: {
      type: String,
      trim: true,
    },
    rating: {
      type: Number,
      default: 0,
      min: [0, 'Rating cannot be less than 0'],
      max: [5, 'Rating cannot be more than 5'],
    },
    totalSales: {
      type: Number,
      default: 0,
      min: [0, 'Total sales cannot be negative'],
    },
    totalOrders: {
      type: Number,
      default: 0,
      min: [0, 'Total orders cannot be negative'],
    },
    badges: {
      type: [String],
      default: [],
    },
    valueTags: {
      type: [String],
      enum: {
        values: [
          'Sustainability',
          'Inclusivity',
          'Community',
          'Creativity',
          'Well-being',
          'Innovation',
          'Collaboration',
          'Empowerment',
        ],
        message: 'Invalid value tag',
      },
      default: [],
    },
    socialLinks: {
      instagram: String,
      facebook: String,
      twitter: String,
      website: String,
    },
    bankDetails: {
      bankName: String,
      accountNumber: String,
      accountName: String,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for faster queries
SellerSchema.index({ userId: 1 });
SellerSchema.index({ approvalStatus: 1 });
SellerSchema.index({ shopName: 1 });

export const Seller = model<ISeller>('Seller', SellerSchema);
export default Seller;
