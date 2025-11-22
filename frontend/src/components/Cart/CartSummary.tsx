import React from 'react';
import { useRouter } from 'next/router';
import { formatPrice } from '@/lib/utils';
import Button from '@/components/Common/Button';
import { useCartStore } from '@/store/cartStore';
import { useAuthStore } from '@/store/authStore';
import { SHIPPING_COST } from '@/lib/constants';

export default function CartSummary() {
  const router = useRouter();
  const total = useCartStore((state) => state.getTotal());
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const items = useCartStore((state) => state.items);

  const shippingCost = SHIPPING_COST;
  const finalTotal = total + shippingCost;

  const handleCheckout = () => {
    if (!isAuthenticated) {
      router.push('/auth/login?redirect=/checkout');
      return;
    }
    router.push('/checkout');
  };

  return (
    <div className="card sticky top-24">
      <h2 className="font-bold text-xl mb-4">Order Summary</h2>
      
      <div className="space-y-3 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">Subtotal ({items.length} items)</span>
          <span className="font-medium">{formatPrice(total)}</span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-gray-600">Shipping</span>
          <span className="font-medium">{formatPrice(shippingCost)}</span>
        </div>
        
        <div className="border-t pt-3 flex justify-between text-lg">
          <span className="font-bold">Total</span>
          <span className="font-bold text-brown-700">{formatPrice(finalTotal)}</span>
        </div>
      </div>

      <Button
        onClick={handleCheckout}
        className="w-full mt-6"
        size="lg"
      >
        Proceed to Checkout
      </Button>

      <p className="text-xs text-gray-500 text-center mt-4">
        Shipping and taxes calculated at checkout
      </p>
    </div>
  );
}
