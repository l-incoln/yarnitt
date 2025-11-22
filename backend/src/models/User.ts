import { Schema, model, Document, Types } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  // Common fields
  email: string;
  password: string;
  name: string;
  phone: string;
  role: 'buyer' | 'seller' | 'admin';
  
  // Email verification
  isEmailVerified: boolean;
  emailVerificationToken?: string;
  emailVerificationExpires?: Date;
  
  // Password reset
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  
  // Seller-specific fields
  shopName?: string;
  bio?: string;
  kraPin?: string;
  sellerStatus?: 'pending' | 'approved' | 'rejected' | 'banned';
  
  // Buyer-specific fields
  wishlist?: Types.ObjectId[];
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  
  // Methods
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const UserSchema = new Schema<IUser>(
  {
    email: { 
      type: String, 
      required: true, 
      unique: true, 
      lowercase: true, 
      trim: true,
      validate: {
        validator: function(v: string) {
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
        },
        message: 'Invalid email format'
      }
    },
    password: { type: String, required: true },
    name: { type: String, required: true },
    phone: { type: String, required: true },
    role: { 
      type: String, 
      enum: ['buyer', 'seller', 'admin'], 
      required: true, 
      default: 'buyer' 
    },
    
    // Email verification
    isEmailVerified: { type: Boolean, default: false },
    emailVerificationToken: { type: String },
    emailVerificationExpires: { type: Date },
    
    // Password reset
    passwordResetToken: { type: String },
    passwordResetExpires: { type: Date },
    
    // Seller-specific fields
    shopName: { 
      type: String,
      required: function(this: IUser) {
        return this.role === 'seller';
      }
    },
    bio: { type: String },
    kraPin: { type: String },
    sellerStatus: { 
      type: String, 
      enum: ['pending', 'approved', 'rejected', 'banned'],
      default: 'pending'
    },
    
    // Buyer-specific fields
    wishlist: [{ type: Schema.Types.ObjectId, ref: 'Product' }],
  },
  { 
    timestamps: true,
    toJSON: {
      transform: function(doc, ret) {
        delete ret.password;
        delete ret.__v;
        return ret;
      }
    }
  }
);

// Hash password before saving
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }
  
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Method to compare passwords
UserSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

export const User = model<IUser>('User', UserSchema);
export default User;