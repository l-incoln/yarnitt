import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { cn } from '@/lib/utils';

const categories = [
  { name: 'All', slug: '' },
  { name: 'Clothing', slug: 'clothing' },
  { name: 'Plushies', slug: 'plushies' },
  { name: 'Bags', slug: 'bags' },
  { name: 'Home Décor', slug: 'home-decor' },
  { name: 'Accessories', slug: 'accessories' },
  { name: 'Eco Collection', slug: 'eco-collection' },
];

export default function SidebarCategories() {
  const router = useRouter();
  const currentCategory = router.query.category as string;

  return (
    <div className="sidebar sticky top-24">
      <h2 className="font-bold text-lg mb-4">Categories</h2>
      <ul className="space-y-2">
        {categories.map((category) => {
          const isActive = category.slug === (currentCategory || '');
          const href = category.slug ? `/shop?category=${category.slug}` : '/shop';

          return (
            <li key={category.slug}>
              <Link
                href={href}
                className={cn(
                  'block px-3 py-2 rounded-button transition-colors',
                  isActive
                    ? 'bg-brown-100 text-brown-700 font-medium'
                    : 'text-gray-700 hover:bg-gray-100'
                )}
              >
                {category.name}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
