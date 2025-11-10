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
