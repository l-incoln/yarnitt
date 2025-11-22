import React from 'react';
import MainLayout from '@/layouts/MainLayout';
import BlogCard from '@/components/Blog/BlogCard';
import type { BlogPost } from '@/types';

// Mock blog posts for now
const mockBlogPosts: BlogPost[] = [
  {
    slug: 'crochet-basics-beginners',
    title: 'Crochet Basics for Beginners',
    excerpt: 'Learn the fundamental stitches and techniques to start your crochet journey.',
    content: 'Full content here...',
    coverImage: '/images/blog1.jpg',
    author: 'Jane Doe',
    publishedAt: '2024-01-15T10:00:00Z',
  },
  {
    slug: 'sustainable-yarn-choices',
    title: 'Sustainable Yarn Choices',
    excerpt: 'Discover eco-friendly yarn options that are perfect for conscious crafters.',
    content: 'Full content here...',
    coverImage: '/images/blog2.jpg',
    author: 'John Smith',
    publishedAt: '2024-01-20T10:00:00Z',
  },
  {
    slug: 'artisan-spotlight-nairobi',
    title: 'Artisan Spotlight: Nairobi Makers',
    excerpt: 'Meet the talented artisans behind our beautiful handmade pieces.',
    content: 'Full content here...',
    coverImage: '/images/blog3.jpg',
    author: 'Mary Johnson',
    publishedAt: '2024-01-25T10:00:00Z',
  },
];

export default function BlogPage() {
  return (
    <MainLayout title="Blog - Yarnitt">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Our Blog</h1>
          <p className="text-xl text-gray-600">
            Stories, tips, and inspiration from the world of handmade crafts
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {mockBlogPosts.map((post) => (
            <BlogCard key={post.slug} post={post} />
          ))}
        </div>
      </div>
    </MainLayout>
  );
}
