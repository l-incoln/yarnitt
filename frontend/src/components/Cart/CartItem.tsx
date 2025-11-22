import React from 'react';
import Link from 'next/link';
import { Minus, Plus, Trash2 } from 'lucide-react';
import type { CartItem as CartItemType } from '@/types';
import { formatPrice } from '@/lib/utils';
import { useCartStore } from '@/store/cartStore';

interface CartItemProps {
  item: CartItemType;
}

export default function CartItem({ item }: CartItemProps) {
  const { updateQuantity, removeItem } = useCartStore();
  const { product, quantity } = item;

  const imageUrl = product.images?.[0]?.url || '/images/placeholder.jpg';
  const itemTotal = product.price * quantity;

  const handleIncrement = () => {
    if (quantity < product.stock) {
      updateQuantity(product._id, quantity + 1);
    }
  };

  const handleDecrement = () => {
    if (quantity > 1) {
      updateQuantity(product._id, quantity - 1);
    }
  };

  const handleRemove = () => {
    removeItem(product._id);
  };

  return (
    <div className="flex gap-4 p-4 bg-white rounded-card shadow-sm">
      {/* Product Image */}
      <Link href={`/product/${product._id}`} className="flex-shrink-0">
        <img
          src={imageUrl}
          alt={product.name}
          className="w-24 h-24 object-cover rounded"
        />
      </Link>

      {/* Product Details */}
      <div className="flex-1">
        <Link 
          href={`/product/${product._id}`}
          className="font-medium text-gray-900 hover:text-brown-600"
        >
          {product.name}
        </Link>
        
        <p className="text-sm text-gray-600 mt-1">{formatPrice(product.price)} each</p>

        {/* Quantity Controls */}
        <div className="flex items-center space-x-2 mt-3">
          <button
            onClick={handleDecrement}
            disabled={quantity <= 1}
            className="p-1 border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50"
          >
            <Minus size={16} />
          </button>
          <span className="px-3 font-medium">{quantity}</span>
          <button
            onClick={handleIncrement}
            disabled={quantity >= product.stock}
            className="p-1 border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50"
          >
            <Plus size={16} />
          </button>
        </div>

        {quantity >= product.stock && (
          <p className="text-xs text-orange-600 mt-1">Maximum available reached</p>
        )}
      </div>

      {/* Item Total & Remove */}
      <div className="flex flex-col items-end justify-between">
        <p className="font-bold text-brown-700">{formatPrice(itemTotal)}</p>
        <button
          onClick={handleRemove}
          className="text-red-600 hover:text-red-700 p-2"
          aria-label="Remove item"
        >
          <Trash2 size={20} />
        </button>
      </div>
    </div>
  );
}
