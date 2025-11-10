import { Schema, model, Types } from "mongoose";

export interface IRefreshToken {
  userId: Types.ObjectId;
  token: string;
  expiresAt: Date;
  revoked?: boolean;
  createdAt?: Date;
}

const RefreshTokenSchema: Schema<IRefreshToken> = new Schema({
  userId: { type: Schema.Types.ObjectId, required: true, ref: "User", index: true },
  token: { type: String, required: true, index: true },
  expiresAt: { type: Date, required: true },
  revoked: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

export default model<IRefreshToken>("RefreshToken", RefreshTokenSchema);