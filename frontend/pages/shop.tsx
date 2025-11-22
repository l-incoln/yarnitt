import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { useQuery } from '@tanstack/react-query';
import MainLayout from '@/layouts/MainLayout';
import ProductGrid from '@/components/Product/ProductGrid';
import SidebarCategories from '@/components/Sidebar/SidebarCategories';
import Loading from '@/components/Common/Loading';
import Pagination from '@/components/Common/Pagination';
import { productsApi } from '@/lib/api';

export default function ShopPage() {
  const router = useRouter();
  const { category, search, page = '1' } = router.query;
  const currentPage = parseInt(page as string);

  const { data: products, isLoading } = useQuery({
    queryKey: ['products', category, search, currentPage],
    queryFn: () => productsApi.getAll({ 
      category: category as string,
      search: search as string,
      page: currentPage,
      limit: 12,
    }),
  });

  const handlePageChange = (newPage: number) => {
    router.push({
      pathname: '/shop',
      query: { ...router.query, page: newPage },
    });
  };

  return (
    <MainLayout title="Shop - Yarnitt">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Shop All Products</h1>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <aside className="lg:col-span-1">
            <SidebarCategories />
          </aside>

          {/* Products */}
          <section className="lg:col-span-3">
            {search && (
              <p className="text-gray-600 mb-4">
                Showing results for: <span className="font-medium">"{search}"</span>
              </p>
            )}

            {isLoading ? (
              <Loading text="Loading products..." />
            ) : (
              <>
                <ProductGrid 
                  products={products || []} 
                  emptyMessage="No products found. Try adjusting your search or filters."
                />
                
                {/* Pagination - Mock for now */}
                {products && products.length > 0 && (
                  <Pagination
                    currentPage={currentPage}
                    totalPages={5}
                    onPageChange={handlePageChange}
                  />
                )}
              </>
            )}
          </section>
        </div>
      </div>
    </MainLayout>
  );
}
