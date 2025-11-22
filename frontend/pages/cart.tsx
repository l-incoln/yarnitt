import React from 'react';
import { useRouter } from 'next/router';
import MainLayout from '@/layouts/MainLayout';
import CartItem from '@/components/Cart/CartItem';
import CartSummary from '@/components/Cart/CartSummary';
import { useCartStore } from '@/store/cartStore';
import { ShoppingBag } from 'lucide-react';
import Button from '@/components/Common/Button';

export default function CartPage() {
  const router = useRouter();
  const items = useCartStore((state) => state.items);

  if (items.length === 0) {
    return (
      <MainLayout title="Shopping Cart - Yarnitt">
        <div className="max-w-7xl mx-auto px-4 py-16">
          <div className="card text-center py-12">
            <ShoppingBag size={64} className="mx-auto text-gray-400 mb-4" />
            <h1 className="text-2xl font-bold mb-4">Your cart is empty</h1>
            <p className="text-gray-600 mb-6">
              Looks like you haven't added anything to your cart yet.
            </p>
            <Button onClick={() => router.push('/shop')}>
              Start Shopping
            </Button>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Shopping Cart - Yarnitt">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Shopping Cart</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {items.map((item) => (
              <CartItem key={item.product._id} item={item} />
            ))}
          </div>

          {/* Cart Summary */}
          <div className="lg:col-span-1">
            <CartSummary />
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
