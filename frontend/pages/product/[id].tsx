import React from 'react';
import { useRouter } from 'next/router';
import { useQuery } from '@tanstack/react-query';
import MainLayout from '@/layouts/MainLayout';
import ProductDetails from '@/components/Product/ProductDetails';
import ProductGrid from '@/components/Product/ProductGrid';
import Loading from '@/components/Common/Loading';
import { productsApi } from '@/lib/api';

export default function ProductPage() {
  const router = useRouter();
  const { id } = router.query;

  const { data: product, isLoading, error } = useQuery({
    queryKey: ['product', id],
    queryFn: () => productsApi.getById(id as string),
    enabled: !!id,
  });

  const { data: relatedProducts } = useQuery({
    queryKey: ['products', 'related'],
    queryFn: () => productsApi.getAll({ limit: 4 }),
    enabled: !!product,
  });

  if (isLoading) {
    return (
      <MainLayout>
        <div className="max-w-7xl mx-auto px-4 py-8">
          <Loading text="Loading product..." />
        </div>
      </MainLayout>
    );
  }

  if (error || !product) {
    return (
      <MainLayout>
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="card text-center py-12">
            <h1 className="text-2xl font-bold mb-4">Product Not Found</h1>
            <p className="text-gray-600 mb-6">The product you're looking for doesn't exist.</p>
            <button
              onClick={() => router.push('/shop')}
              className="btn-primary"
            >
              Back to Shop
            </button>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title={`${product.name} - Yarnitt`}>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <ProductDetails product={product} />

        {/* Related Products */}
        {relatedProducts && relatedProducts.length > 0 && (
          <section className="mt-16">
            <h2 className="text-2xl font-bold mb-6">You Might Also Like</h2>
            <ProductGrid products={relatedProducts} />
          </section>
        )}
      </div>
    </MainLayout>
  );
}
