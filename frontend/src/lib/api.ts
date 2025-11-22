import axios, { AxiosInstance, AxiosError } from 'axios';
import { getAuthToken, removeAuthToken } from './utils';
import { API_URL } from './constants';
import type {
  Product,
  User,
  Order,
  LoginCredentials,
  RegisterData,
  AuthResponse,
  CheckoutFormData,
} from '@/types';

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = getAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle 401 errors
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      removeAuthToken();
      if (typeof window !== 'undefined') {
        window.location.href = '/auth/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/api/auth/login', credentials);
    return response.data;
  },

  register: async (data: RegisterData): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/api/auth/register', data);
    return response.data;
  },

  logout: async (): Promise<void> => {
    // Clear local token
    removeAuthToken();
  },
};

// Products API
export const productsApi = {
  getAll: async (params?: {
    page?: number;
    limit?: number;
    category?: string;
    search?: string;
  }): Promise<Product[]> => {
    const response = await api.get<Product[]>('/products', { params });
    return response.data;
  },

  getById: async (id: string): Promise<Product> => {
    const response = await api.get<Product>(`/products/${id}`);
    return response.data;
  },

  getBySeller: async (sellerId: string): Promise<Product[]> => {
    const response = await api.get<Product[]>(`/products/seller/${sellerId}`);
    return response.data;
  },
};

// Orders API
export const ordersApi = {
  create: async (orderData: {
    items: Array<{ product: string; quantity: number; price: number }>;
    shippingAddress: CheckoutFormData;
    paymentMethod: string;
  }): Promise<Order> => {
    const response = await api.post<Order>('/api/orders', orderData);
    return response.data;
  },

  getBuyerOrders: async (): Promise<Order[]> => {
    const response = await api.get<Order[]>('/api/orders/buyer');
    return response.data;
  },

  getById: async (id: string): Promise<Order> => {
    const response = await api.get<Order>(`/api/orders/${id}`);
    return response.data;
  },

  cancelOrder: async (id: string): Promise<Order> => {
    const response = await api.patch<Order>(`/api/orders/${id}/cancel`);
    return response.data;
  },
};

// Users API
export const usersApi = {
  getById: async (id: string): Promise<User> => {
    const response = await api.get<User>(`/api/users/${id}`);
    return response.data;
  },

  updateProfile: async (id: string, data: Partial<User>): Promise<User> => {
    const response = await api.patch<User>(`/api/users/${id}`, data);
    return response.data;
  },
};

export default api;
