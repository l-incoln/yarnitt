import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import MainLayout from '@/layouts/MainLayout';
import Loading from '@/components/Common/Loading';
import { useAuthStore } from '@/store/authStore';
import { ordersApi } from '@/lib/api';
import { formatPrice, formatDate, getOrderStatusColor } from '@/lib/utils';
import { Package } from 'lucide-react';

export default function OrdersPage() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login?redirect=/orders');
    }
  }, [isAuthenticated, router]);

  const { data: orders, isLoading } = useQuery({
    queryKey: ['orders', 'buyer'],
    queryFn: () => ordersApi.getBuyerOrders(),
    enabled: isAuthenticated,
  });

  if (!isAuthenticated) {
    return null;
  }

  return (
    <MainLayout title="My Orders - Yarnitt">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">My Orders</h1>

        {isLoading ? (
          <Loading text="Loading orders..." />
        ) : orders && orders.length > 0 ? (
          <div className="space-y-4">
            {orders.map((order) => (
              <Link key={order._id} href={`/orders/${order._id}`}>
                <div className="card hover:shadow-hover transition-shadow cursor-pointer">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-4 mb-2">
                        <Package size={20} className="text-brown-600" />
                        <span className="font-medium">Order #{order.orderNumber}</span>
                        <span className={`text-xs px-2 py-1 rounded ${getOrderStatusColor(order.status)}`}>
                          {order.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">
                        Placed on {formatDate(order.createdAt)}
                      </p>
                      <p className="text-sm text-gray-600">
                        {order.items.length} item(s)
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg text-brown-700">
                        {formatPrice(order.total)}
                      </p>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="card text-center py-12">
            <Package size={64} className="mx-auto text-gray-400 mb-4" />
            <h2 className="text-2xl font-bold mb-4">No orders yet</h2>
            <p className="text-gray-600 mb-6">
              You haven't placed any orders yet. Start shopping to see your orders here!
            </p>
            <button
              onClick={() => router.push('/shop')}
              className="btn-primary"
            >
              Start Shopping
            </button>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
