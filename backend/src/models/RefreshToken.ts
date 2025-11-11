import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IRefreshToken extends Document {
  user: Types.ObjectId;
  tokenHash: string;
  revoked: boolean;
  replacedBy?: string | null;
  expiresAt: Date;
  createdAt: Date;
}

const RefreshTokenSchema: Schema = new Schema<IRefreshToken>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tokenHash: { type: String, required: true, index: true },
    revoked: { type: Boolean, default: false },
    replacedBy: { type: String, default: null },
    expiresAt: { type: Date, required: true, index: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

const RefreshToken = mongoose.model<IRefreshToken>('RefreshToken', RefreshTokenSchema);
export default RefreshToken;
