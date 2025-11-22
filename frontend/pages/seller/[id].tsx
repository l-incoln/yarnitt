import React from 'react';
import { useRouter } from 'next/router';
import { useQuery } from '@tanstack/react-query';
import MainLayout from '@/layouts/MainLayout';
import ProductGrid from '@/components/Product/ProductGrid';
import Loading from '@/components/Common/Loading';
import { productsApi, usersApi } from '@/lib/api';
import { Store, Mail, Phone } from 'lucide-react';

export default function SellerPage() {
  const router = useRouter();
  const { id } = router.query;

  const { data: seller, isLoading: sellerLoading } = useQuery({
    queryKey: ['seller', id],
    queryFn: () => usersApi.getById(id as string),
    enabled: !!id,
  });

  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ['products', 'seller', id],
    queryFn: () => productsApi.getBySeller(id as string),
    enabled: !!id,
  });

  if (sellerLoading) {
    return (
      <MainLayout>
        <div className="max-w-7xl mx-auto px-4 py-8">
          <Loading text="Loading seller profile..." />
        </div>
      </MainLayout>
    );
  }

  if (!seller) {
    return (
      <MainLayout>
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="card text-center py-12">
            <h1 className="text-2xl font-bold mb-4">Seller Not Found</h1>
            <p className="text-gray-600 mb-6">The seller you're looking for doesn't exist.</p>
            <button onClick={() => router.push('/shop')} className="btn-primary">
              Back to Shop
            </button>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title={`${seller.shopName || seller.name} - Yarnitt`}>
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Seller Profile */}
        <div className="card mb-8">
          <div className="flex items-start space-x-6">
            <div className="w-24 h-24 bg-brown-100 rounded-full flex items-center justify-center">
              <Store size={48} className="text-brown-600" />
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-bold mb-2">{seller.shopName || seller.name}</h1>
              <p className="text-gray-600 mb-4">Artisan since {new Date(seller.createdAt).getFullYear()}</p>
              
              <div className="space-y-2 text-sm">
                {seller.email && (
                  <div className="flex items-center space-x-2 text-gray-700">
                    <Mail size={16} />
                    <span>{seller.email}</span>
                  </div>
                )}
                {seller.phone && (
                  <div className="flex items-center space-x-2 text-gray-700">
                    <Phone size={16} />
                    <span>{seller.phone}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Seller Products */}
        <div>
          <h2 className="text-2xl font-bold mb-6">Products by {seller.shopName || seller.name}</h2>
          {productsLoading ? (
            <Loading text="Loading products..." />
          ) : (
            <ProductGrid 
              products={products || []} 
              emptyMessage="This seller has no products available at the moment"
            />
          )}
        </div>
      </div>
    </MainLayout>
  );
}
