import Order from '../models/Order';
import { ORDER_STATUS, PLATFORM_COMMISSION_RATE } from '../constants/orderConstants';

/**
 * Generate unique order number in format ORD-YYYYMMDD-XXX
 */
export async function generateOrderNumber(): Promise<string> {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const dateStr = `${year}${month}${day}`;
  
  // Find the count of orders created today
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
  
  const count = await Order.countDocuments({
    createdAt: { $gte: startOfDay, $lt: endOfDay }
  });
  
  const sequence = String(count + 1).padStart(3, '0');
  return `ORD-${dateStr}-${sequence}`;
}

/**
 * Calculate commission and seller earnings
 */
export function calculateCommission(totalAmount: number): { commission: number; sellerEarnings: number } {
  const commission = Math.round(totalAmount * PLATFORM_COMMISSION_RATE * 100) / 100;
  const sellerEarnings = Math.round((totalAmount - commission) * 100) / 100;
  return { commission, sellerEarnings };
}

/**
 * Check if order can be cancelled
 */
export function canCancelOrder(status: string): boolean {
  const cancellableStatuses = [ORDER_STATUS.PENDING, ORDER_STATUS.CONFIRMED];
  return cancellableStatuses.includes(status as any);
}

/**
 * Validate status transition
 */
export function canUpdateStatus(currentStatus: string, newStatus: string): { valid: boolean; error?: string } {
  const validTransitions: { [key: string]: string[] } = {
    [ORDER_STATUS.PENDING]: [ORDER_STATUS.CONFIRMED, ORDER_STATUS.CANCELLED],
    [ORDER_STATUS.CONFIRMED]: [ORDER_STATUS.PROCESSING, ORDER_STATUS.CANCELLED],
    [ORDER_STATUS.PROCESSING]: [ORDER_STATUS.SHIPPED],
    [ORDER_STATUS.SHIPPED]: [ORDER_STATUS.DELIVERED],
    [ORDER_STATUS.DELIVERED]: [ORDER_STATUS.REFUNDED],
    [ORDER_STATUS.CANCELLED]: [],
    [ORDER_STATUS.REFUNDED]: [],
  };

  if (!validTransitions[currentStatus]) {
    return { valid: false, error: 'Invalid current status' };
  }

  if (!validTransitions[currentStatus].includes(newStatus)) {
    return {
      valid: false,
      error: `Cannot transition from ${currentStatus} to ${newStatus}`,
    };
  }

  return { valid: true };
}
