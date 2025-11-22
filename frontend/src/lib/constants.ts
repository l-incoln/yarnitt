/**
 * Application constants
 */

// API Configuration
export const API_URL = process.env.NEXT_PUBLIC_API_URL;

if (!API_URL) {
  console.warn('NEXT_PUBLIC_API_URL is not set. API calls may fail.');
}

// Placeholder Images
export const PLACEHOLDER_IMAGE = '/images/placeholder.jpg';
export const PLACEHOLDER_PRODUCT_IMAGE = '/images/placeholder-product.jpg';

// Business Logic Constants
export const SHIPPING_COST = 200; // KES - Fixed shipping cost
export const FREE_SHIPPING_THRESHOLD = 5000; // KES - Free shipping above this amount

// Pagination
export const DEFAULT_PAGE_SIZE = 12;
export const MAX_PAGE_SIZE = 100;

// Cart
export const MAX_CART_QUANTITY = 99;

// Order Status Colors
export const ORDER_STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  processing: 'bg-purple-100 text-purple-800',
  shipped: 'bg-indigo-100 text-indigo-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
  refunded: 'bg-gray-100 text-gray-800',
};
