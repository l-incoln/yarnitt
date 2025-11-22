import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useQuery } from '@tanstack/react-query';
import MainLayout from '@/layouts/MainLayout';
import Loading from '@/components/Common/Loading';
import { useAuthStore } from '@/store/authStore';
import { ordersApi } from '@/lib/api';
import { formatPrice, formatDate, getOrderStatusColor } from '@/lib/utils';
import { PLACEHOLDER_PRODUCT_IMAGE } from '@/lib/constants';
import { Package, MapPin, CreditCard } from 'lucide-react';
import type { Product } from '@/types';

export default function OrderDetailsPage() {
  const router = useRouter();
  const { id } = router.query;
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login?redirect=/orders');
    }
  }, [isAuthenticated, router]);

  const { data: order, isLoading, error } = useQuery({
    queryKey: ['order', id],
    queryFn: () => ordersApi.getById(id as string),
    enabled: !!id && isAuthenticated,
  });

  if (!isAuthenticated) {
    return null;
  }

  if (isLoading) {
    return (
      <MainLayout>
        <div className="max-w-7xl mx-auto px-4 py-8">
          <Loading text="Loading order details..." />
        </div>
      </MainLayout>
    );
  }

  if (error || !order) {
    return (
      <MainLayout>
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="card text-center py-12">
            <h1 className="text-2xl font-bold mb-4">Order Not Found</h1>
            <p className="text-gray-600 mb-6">The order you're looking for doesn't exist.</p>
            <button onClick={() => router.push('/orders')} className="btn-primary">
              Back to Orders
            </button>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title={`Order ${order.orderNumber} - Yarnitt`}>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">Order Details</h1>
          <span className={`px-4 py-2 rounded-button ${getOrderStatusColor(order.status)}`}>
            {order.status}
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Order Items */}
          <div className="lg:col-span-2 space-y-6">
            <div className="card">
              <div className="flex items-center space-x-2 mb-4">
                <Package size={20} className="text-brown-600" />
                <h2 className="font-bold text-xl">Order Items</h2>
              </div>
              <div className="space-y-4">
                {order.items.map((item, index) => {
                  const product = typeof item.product === 'object' ? item.product : null;
                  return (
                    <div key={index} className="flex gap-4 pb-4 border-b last:border-b-0">
                      {product && (
                        <>
                          <img
                            src={product.images?.[0]?.url || PLACEHOLDER_PRODUCT_IMAGE}
                            alt={product.name}
                            className="w-20 h-20 object-cover rounded"
                          />
                          <div className="flex-1">
                            <h3 className="font-medium">{product.name}</h3>
                            <p className="text-sm text-gray-600">Quantity: {item.quantity}</p>
                            <p className="text-sm text-gray-600">{formatPrice(item.price)} each</p>
                          </div>
                          <p className="font-bold text-brown-700">
                            {formatPrice(item.price * item.quantity)}
                          </p>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Shipping Address */}
            <div className="card">
              <div className="flex items-center space-x-2 mb-4">
                <MapPin size={20} className="text-brown-600" />
                <h2 className="font-bold text-xl">Shipping Address</h2>
              </div>
              <div className="text-gray-700">
                <p className="font-medium">{order.shippingAddress.fullName}</p>
                <p>{order.shippingAddress.phone}</p>
                <p className="mt-2">{order.shippingAddress.address}</p>
                <p>
                  {order.shippingAddress.city}
                  {order.shippingAddress.postalCode && `, ${order.shippingAddress.postalCode}`}
                </p>
                <p>{order.shippingAddress.country}</p>
              </div>
            </div>

            {/* Payment Method */}
            <div className="card">
              <div className="flex items-center space-x-2 mb-4">
                <CreditCard size={20} className="text-brown-600" />
                <h2 className="font-bold text-xl">Payment Method</h2>
              </div>
              <p className="text-gray-700 capitalize">{order.paymentMethod}</p>
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="card sticky top-24">
              <h2 className="font-bold text-xl mb-4">Order Summary</h2>
              <div className="space-y-2 text-sm mb-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Order Number</span>
                  <span className="font-medium">{order.orderNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Order Date</span>
                  <span className="font-medium">{formatDate(order.createdAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-medium">{formatPrice(order.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Shipping</span>
                  <span className="font-medium">{formatPrice(order.shippingCost)}</span>
                </div>
              </div>
              <div className="border-t pt-4 flex justify-between text-lg">
                <span className="font-bold">Total</span>
                <span className="font-bold text-brown-700">{formatPrice(order.total)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
