import { Schema, model, Document, Types } from 'mongoose';

interface IOrderItem {
  productId: Types.ObjectId;
  sellerId: Types.ObjectId;
  title: string;
  price: number;
  quantity: number;
  thumbnailImage: string;
}

interface IShippingAddress {
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  county: string;
  postalCode: string;
  country: string;
}

export interface IOrder extends Document {
  orderNumber: string;
  buyerId: Types.ObjectId;
  items: IOrderItem[];
  subtotal: number;
  shippingCost: number;
  tax: number;
  totalAmount: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  paymentMethod: 'mpesa' | 'paypal' | 'card';
  paymentTransactionId?: string;
  shippingAddress: IShippingAddress;
  trackingNumber?: string;
  estimatedDeliveryDate?: Date;
  deliveredAt?: Date;
  cancelledAt?: Date;
  cancellationReason?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const OrderItemSchema = new Schema<IOrderItem>(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    sellerId: {
      type: Schema.Types.ObjectId,
      ref: 'Seller',
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    price: {
      type: Number,
      required: true,
      min: [0, 'Price cannot be negative'],
    },
    quantity: {
      type: Number,
      required: true,
      min: [1, 'Quantity must be at least 1'],
    },
    thumbnailImage: {
      type: String,
      required: true,
    },
  },
  { _id: false }
);

const ShippingAddressSchema = new Schema<IShippingAddress>(
  {
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
    },
    phone: {
      type: String,
      required: [true, 'Phone is required'],
      trim: true,
    },
    addressLine1: {
      type: String,
      required: [true, 'Address line 1 is required'],
      trim: true,
    },
    addressLine2: {
      type: String,
      trim: true,
    },
    city: {
      type: String,
      required: [true, 'City is required'],
      trim: true,
    },
    county: {
      type: String,
      required: [true, 'County is required'],
      trim: true,
    },
    postalCode: {
      type: String,
      required: [true, 'Postal code is required'],
      trim: true,
    },
    country: {
      type: String,
      required: [true, 'Country is required'],
      trim: true,
      default: 'Kenya',
    },
  },
  { _id: false }
);

const OrderSchema = new Schema<IOrder>(
  {
    orderNumber: {
      type: String,
      unique: true,
      required: true,
    },
    buyerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Buyer ID is required'],
    },
    items: {
      type: [OrderItemSchema],
      required: [true, 'Order items are required'],
      validate: {
        validator: function (v: IOrderItem[]) {
          return v && v.length > 0;
        },
        message: 'Order must have at least one item',
      },
    },
    subtotal: {
      type: Number,
      required: [true, 'Subtotal is required'],
      min: [0, 'Subtotal cannot be negative'],
    },
    shippingCost: {
      type: Number,
      required: [true, 'Shipping cost is required'],
      min: [0, 'Shipping cost cannot be negative'],
      default: 0,
    },
    tax: {
      type: Number,
      required: [true, 'Tax is required'],
      min: [0, 'Tax cannot be negative'],
      default: 0,
    },
    totalAmount: {
      type: Number,
      required: [true, 'Total amount is required'],
      min: [0, 'Total amount cannot be negative'],
    },
    status: {
      type: String,
      enum: {
        values: ['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'],
        message: 'Invalid order status',
      },
      default: 'pending',
    },
    paymentStatus: {
      type: String,
      enum: {
        values: ['pending', 'paid', 'failed', 'refunded'],
        message: 'Invalid payment status',
      },
      default: 'pending',
    },
    paymentMethod: {
      type: String,
      enum: {
        values: ['mpesa', 'paypal', 'card'],
        message: 'Invalid payment method',
      },
      required: [true, 'Payment method is required'],
    },
    paymentTransactionId: {
      type: String,
      trim: true,
    },
    shippingAddress: {
      type: ShippingAddressSchema,
      required: [true, 'Shipping address is required'],
    },
    trackingNumber: {
      type: String,
      trim: true,
    },
    estimatedDeliveryDate: {
      type: Date,
    },
    deliveredAt: {
      type: Date,
    },
    cancelledAt: {
      type: Date,
    },
    cancellationReason: {
      type: String,
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for faster queries
OrderSchema.index({ orderNumber: 1 });
OrderSchema.index({ buyerId: 1 });
OrderSchema.index({ status: 1 });
OrderSchema.index({ paymentStatus: 1 });

// Auto-generate orderNumber before saving
OrderSchema.pre('save', function (next) {
  if (!this.orderNumber) {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, '0');
    this.orderNumber = `YRN${timestamp}${random}`;
  }
  next();
});

export const Order = model<IOrder>('Order', OrderSchema);
export default Order;
