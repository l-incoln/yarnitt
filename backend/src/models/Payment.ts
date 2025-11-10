import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IPayment extends Document {
  order?: Types.ObjectId;
  user: Types.ObjectId;
  provider: string;
  providerId?: string;
  amountCents: number;
  currency?: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  rawResponse?: Record<string, any>;
  createdAt: Date;
}

const PaymentSchema: Schema = new Schema<IPayment>(
  {
    order: { type: Schema.Types.ObjectId, ref: 'Order' },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    provider: { type: String, required: true },
    providerId: { type: String, index: true, unique: false, sparse: true },
    amountCents: { type: Number, required: true },
    currency: { type: String, default: 'KES' },
    status: { type: String, default: 'PENDING' },
    rawResponse: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

const Payment = mongoose.model<IPayment>('Payment', PaymentSchema);
export default Payment;
