export const ORDER_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  PROCESSING: 'processing',
  SHIPPED: 'shipped',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
  REFUNDED: 'refunded'
} as const;

export const PAYMENT_STATUS = {
  PENDING: 'pending',
  PAID: 'paid',
  FAILED: 'failed',
  REFUNDED: 'refunded'
} as const;

export const PAYMENT_METHODS = {
  MPESA: 'mpesa',
  PAYPAL: 'paypal',
  CARD: 'card',
  PENDING: 'pending'
} as const;

export const PLATFORM_COMMISSION_RATE = 0.10; // 10%
export const DEFAULT_DELIVERY_DAYS = 7;
