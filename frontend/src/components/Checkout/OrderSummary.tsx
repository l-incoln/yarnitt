import React from 'react';
import { formatPrice } from '@/lib/utils';
import { useCartStore } from '@/store/cartStore';
import { SHIPPING_COST } from '@/lib/constants';

export default function OrderSummary() {
  const items = useCartStore((state) => state.items);
  const total = useCartStore((state) => state.getTotal());
  
  const shippingCost = SHIPPING_COST;
  const finalTotal = total + shippingCost;

  return (
    <div className="card">
      <h2 className="font-bold text-xl mb-4">Order Summary</h2>
      
      {/* Items List */}
      <div className="space-y-3 mb-4">
        {items.map((item) => (
          <div key={item.product._id} className="flex justify-between text-sm">
            <div className="flex-1">
              <p className="font-medium">{item.product.name}</p>
              <p className="text-gray-600">Qty: {item.quantity}</p>
            </div>
            <p className="font-medium">{formatPrice(item.product.price * item.quantity)}</p>
          </div>
        ))}
      </div>

      <div className="border-t pt-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Subtotal</span>
          <span className="font-medium">{formatPrice(total)}</span>
        </div>
        
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Shipping</span>
          <span className="font-medium">{formatPrice(shippingCost)}</span>
        </div>
        
        <div className="border-t pt-2 flex justify-between text-lg">
          <span className="font-bold">Total</span>
          <span className="font-bold text-brown-700">{formatPrice(finalTotal)}</span>
        </div>
      </div>
    </div>
  );
}
