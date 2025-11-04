import mongoose, { Document, Schema } from "mongoose";
import * as bcrypt from "bcryptjs";

export interface IUser extends Document {
  email: string;
  passwordHash: string;
  name?: string;
  createdAt: Date;
  setPassword(password: string): Promise<void>;
  verifyPassword(password: string): Promise<boolean>;
}

const UserSchema = new Schema<IUser>({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  passwordHash: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    trim: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Method to set password with bcrypt hashing
UserSchema.methods.setPassword = async function (password: string): Promise<void> {
  const saltRounds = 10;
  this.passwordHash = await bcrypt.hash(password, saltRounds);
};

// Method to verify password
UserSchema.methods.verifyPassword = async function (password: string): Promise<boolean> {
  return await bcrypt.compare(password, this.passwordHash);
};

export const User = mongoose.model<IUser>("User", UserSchema);
