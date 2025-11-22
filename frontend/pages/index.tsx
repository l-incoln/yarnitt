import React from 'react';
import { useQuery } from '@tanstack/react-query';
import MainLayout from '@/layouts/MainLayout';
import ProductGrid from '@/components/Product/ProductGrid';
import SidebarCategories from '@/components/Sidebar/SidebarCategories';
import Loading from '@/components/Common/Loading';
import { productsApi } from '@/lib/api';

export default function HomePage() {
  const { data: products, isLoading } = useQuery({
    queryKey: ['products', 'featured'],
    queryFn: () => productsApi.getAll({ limit: 12 }),
  });

  return (
    <MainLayout title="Yarnitt - Handmade. Heartmade.">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Hero Banner */}
        <section className="card mb-8 text-center py-12">
          <h1 className="text-4xl md:text-5xl font-bold text-brown-700 mb-4">
            Handmade. Heartmade.
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Discover beautiful crochet goods from talented Kenyan artisans
          </p>
        </section>

        {/* Sidebar + Products Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <aside className="lg:col-span-1">
            <SidebarCategories />
          </aside>

          {/* Products */}
          <section className="lg:col-span-3">
            <h2 className="text-2xl font-bold mb-6">Featured Products</h2>
            {isLoading ? (
              <Loading text="Loading products..." />
            ) : (
              <ProductGrid 
                products={products || []} 
                emptyMessage="No products available at the moment"
              />
            )}
          </section>
        </div>
      </div>
    </MainLayout>
  );
}