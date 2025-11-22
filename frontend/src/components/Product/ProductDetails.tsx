import React, { useState } from 'react';
import Link from 'next/link';
import { Minus, Plus, ShoppingCart, Store } from 'lucide-react';
import type { Product } from '@/types';
import { formatPrice } from '@/lib/utils';
import { useCartStore } from '@/store/cartStore';
import Button from '@/components/Common/Button';
import toast from 'react-hot-toast';

interface ProductDetailsProps {
  product: Product;
}

export default function ProductDetails({ product }: ProductDetailsProps) {
  const [quantity, setQuantity] = useState(1);
  const addItem = useCartStore((state) => state.addItem);

  const handleAddToCart = () => {
    addItem(product, quantity);
    toast.success(`Added ${quantity} item(s) to cart!`);
  };

  const incrementQuantity = () => {
    if (quantity < product.stock) {
      setQuantity(quantity + 1);
    }
  };

  const decrementQuantity = () => {
    if (quantity > 1) {
      setQuantity(quantity - 1);
    }
  };

  const imageUrl = product.images?.[0]?.url || '/images/placeholder.jpg';
  const sellerId = typeof product.seller === 'string' ? product.seller : product.seller._id;
  const sellerName = typeof product.seller === 'object' ? product.seller.shopName || product.seller.name : 'Seller';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Image Gallery */}
      <div>
        <div className="bg-gray-100 rounded-card overflow-hidden aspect-square">
          <img
            src={imageUrl}
            alt={product.name}
            className="w-full h-full object-cover"
          />
        </div>
      </div>

      {/* Product Info */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-4">{product.name}</h1>
        
        <div className="text-3xl font-bold text-brown-700 mb-6">
          {formatPrice(product.price)}
        </div>

        {/* Seller Info */}
        <Link 
          href={`/seller/${sellerId}`}
          className="flex items-center space-x-2 text-gray-600 hover:text-brown-600 mb-6"
        >
          <Store size={20} />
          <span>Sold by: {sellerName}</span>
        </Link>

        {/* Stock Status */}
        <div className="mb-6">
          {product.stock > 0 ? (
            <span className="text-green-600 font-medium">
              In Stock ({product.stock} available)
            </span>
          ) : (
            <span className="text-red-600 font-medium">Out of Stock</span>
          )}
        </div>

        {/* Description */}
        {product.description && (
          <div className="mb-6">
            <h2 className="font-semibold text-lg mb-2">Description</h2>
            <p className="text-gray-700 whitespace-pre-line">{product.description}</p>
          </div>
        )}

        {/* Quantity Selector */}
        {product.stock > 0 && (
          <div className="mb-6">
            <label className="label-field">Quantity</label>
            <div className="flex items-center space-x-4">
              <div className="flex items-center border border-gray-300 rounded-button">
                <button
                  onClick={decrementQuantity}
                  className="p-2 hover:bg-gray-100"
                  disabled={quantity <= 1}
                >
                  <Minus size={20} />
                </button>
                <span className="px-4 font-medium">{quantity}</span>
                <button
                  onClick={incrementQuantity}
                  className="p-2 hover:bg-gray-100"
                  disabled={quantity >= product.stock}
                >
                  <Plus size={20} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add to Cart Button */}
        <Button
          onClick={handleAddToCart}
          disabled={product.stock === 0}
          className="w-full flex items-center justify-center space-x-2"
          size="lg"
        >
          <ShoppingCart size={20} />
          <span>Add to Cart</span>
        </Button>

        {/* Additional Info */}
        <div className="mt-8 space-y-2 text-sm text-gray-600">
          <p>• Handmade with love in Kenya</p>
          <p>• Each item is unique</p>
          <p>• Supports local artisans</p>
        </div>
      </div>
    </div>
  );
}
