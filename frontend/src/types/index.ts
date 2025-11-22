// User types
export interface User {
  _id: string;
  email: string;
  name?: string;
  role: 'buyer' | 'seller' | 'admin';
  phone?: string;
  shopName?: string;
  address?: Address;
  createdAt: string;
}

export interface Address {
  fullName: string;
  phone: string;
  address: string;
  city: string;
  postalCode?: string;
  country: string;
}

// Product types
export interface Product {
  _id: string;
  name: string;
  price: number;
  description?: string;
  stock: number;
  sold: number;
  seller: string | User;
  images?: ProductImage[];
  category?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProductImage {
  url: string;
  thumbnail_url?: string;
}

// Cart types
export interface CartItem {
  product: Product;
  quantity: number;
}

export interface Cart {
  items: CartItem[];
  total: number;
}

// Order types
export interface Order {
  _id: string;
  orderNumber: string;
  buyer: string | User;
  items: OrderItem[];
  shippingAddress: Address;
  paymentMethod: string;
  subtotal: number;
  shippingCost: number;
  total: number;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
  shippedAt?: string;
  deliveredAt?: string;
  cancelledAt?: string;
}

export interface OrderItem {
  product: string | Product;
  quantity: number;
  price: number;
}

export type OrderStatus = 
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'refunded';

// Auth types
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name?: string;
  role?: 'buyer' | 'seller';
}

export interface AuthResponse {
  user: User;
  token: string;
}

// Blog types
export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  coverImage?: string;
  author: string;
  publishedAt: string;
}

// API Response types
export interface ApiResponse<T> {
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Form types
export interface ShippingFormData {
  fullName: string;
  phone: string;
  address: string;
  city: string;
  postalCode?: string;
  country: string;
}

export interface CheckoutFormData extends ShippingFormData {
  paymentMethod: string;
}
