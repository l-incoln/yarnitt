import { Schema, model, Document } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  email: string;
  passwordHash: string;
  name?: string;
  role: 'buyer' | 'seller' | 'admin';
  phone?: string;
  shopName?: string;
  address?: {
    fullName: string;
    phone: string;
    address: string;
    city: string;
    postalCode?: string;
    country: string;
  };
  createdAt: Date;
  setPassword(password: string): Promise<void>;
  verifyPassword(password: string): Promise<boolean>;
}

const UserSchema = new Schema<IUser>({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  name: { type: String, default: '' },
  role: { type: String, enum: ['buyer', 'seller', 'admin'], default: 'buyer' },
  phone: { type: String },
  shopName: { type: String },
  address: {
    fullName: String,
    phone: String,
    address: String,
    city: String,
    postalCode: String,
    country: String,
  },
  createdAt: { type: Date, default: Date.now },
});

UserSchema.methods.setPassword = async function (password: string) {
  const salt = await bcrypt.genSalt(10);
  this.passwordHash = await bcrypt.hash(password, salt);
};

UserSchema.methods.verifyPassword = async function (password: string) {
  return bcrypt.compare(password, this.passwordHash);
};

export const User = model<IUser>('User', UserSchema);
export default User;