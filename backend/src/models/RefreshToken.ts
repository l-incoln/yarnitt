import mongoose, { Schema, Document, Model } from "mongoose";

export interface IRefreshToken extends Document {
  userId: string;
  token: string;
  expiresAt: Date;
  createdAt: Date;
  revoked?: boolean;
}

const RefreshTokenSchema: Schema<IRefreshToken> = new Schema({
  userId: { 
    type: Schema.Types.ObjectId, 
    required: true, 
    ref: "User", 
    index: true 
  },
  token: { 
    type: String, 
    required: true, 
    index: true 
  },
  expiresAt: { 
    type: Date, 
    required: true 
  },
  revoked: { 
    type: Boolean, 
    default: false 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
});

const RefreshToken: Model<IRefreshToken> = 
  mongoose.models.RefreshToken || 
  mongoose.model<IRefreshToken>("RefreshToken", RefreshTokenSchema);

export default RefreshToken;
