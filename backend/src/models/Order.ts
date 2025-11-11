import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IOrderItem {
  product: Types.ObjectId;
  title: string;
  priceCents: number;
  quantity: number;
}

export interface IOrder extends Document {
  buyer: Types.ObjectId;
  items: IOrderItem[];
  subtotalCents: number;
  shippingCents: number;
  totalCents: number;
  currency?: string;
  status: 'PENDING' | 'PAID' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | 'REFUNDED';
  shippingAddress?: any;
  createdAt: Date;
}

const OrderItemSchema = new Schema<IOrderItem>({
  product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  title: { type: String },
  priceCents: { type: Number, required: true },
  quantity: { type: Number, required: true },
});

const OrderSchema: Schema = new Schema<IOrder>(
  {
    buyer: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    items: { type: [OrderItemSchema], required: true },
    subtotalCents: { type: Number, required: true },
    shippingCents: { type: Number, default: 0 },
    totalCents: { type: Number, required: true },
    currency: { type: String, default: 'KES' },
    status: { type: String, default: 'PENDING' },
    shippingAddress: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

const Order = mongoose.model<IOrder>('Order', OrderSchema);
export default Order;
