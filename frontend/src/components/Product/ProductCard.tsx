import React from 'react';
import Link from 'next/link';
import { ShoppingCart } from 'lucide-react';
import type { Product } from '@/types';
import { formatPrice } from '@/lib/utils';
import { useCartStore } from '@/store/cartStore';
import { PLACEHOLDER_PRODUCT_IMAGE } from '@/lib/constants';
import toast from 'react-hot-toast';

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const addItem = useCartStore((state) => state.addItem);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem(product, 1);
    toast.success('Added to cart!');
  };

  const imageUrl = product.images?.[0]?.url || PLACEHOLDER_PRODUCT_IMAGE;

  return (
    <Link href={`/product/${product._id}`}>
      <div className="product-card group cursor-pointer">
        <div className="relative overflow-hidden rounded-md bg-gray-100 aspect-square">
          <img
            src={imageUrl}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
          />
          {product.stock === 0 && (
            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
              <span className="text-white font-semibold">Out of Stock</span>
            </div>
          )}
        </div>

        <div className="p-4">
          <h3 className="font-medium text-gray-900 truncate group-hover:text-brown-600 transition-colors">
            {product.name}
          </h3>
          
          <div className="mt-2 flex items-center justify-between">
            <span className="text-lg font-bold text-brown-700">
              {formatPrice(product.price)}
            </span>
            
            <button
              onClick={handleAddToCart}
              disabled={product.stock === 0}
              className="p-2 bg-brown-600 text-white rounded-button hover:bg-brown-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Add to cart"
            >
              <ShoppingCart size={18} />
            </button>
          </div>

          {product.stock > 0 && product.stock <= 5 && (
            <p className="text-xs text-orange-600 mt-1">Only {product.stock} left!</p>
          )}
        </div>
      </div>
    </Link>
  );
}
