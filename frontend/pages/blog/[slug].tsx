import React from 'react';
import { useRouter } from 'next/router';
import MainLayout from '@/layouts/MainLayout';
import { Calendar, User, ArrowLeft } from 'lucide-react';
import { formatDate } from '@/lib/utils';

// Mock blog post for now
const mockPost = {
  slug: 'crochet-basics-beginners',
  title: 'Crochet Basics for Beginners',
  excerpt: 'Learn the fundamental stitches and techniques to start your crochet journey.',
  content: `
    <p>Crochet is a wonderful craft that allows you to create beautiful, functional items from simple yarn and a hook. Whether you're looking to make cozy blankets, stylish accessories, or adorable plushies, learning the basics of crochet is the first step on your creative journey.</p>

    <h2>Getting Started</h2>
    <p>To begin crocheting, you'll need just a few basic supplies: a crochet hook, yarn, and scissors. The size of your hook and the weight of your yarn will determine the size and texture of your finished project.</p>

    <h2>Essential Stitches</h2>
    <p>The foundation of crochet lies in mastering a few key stitches:</p>
    <ul>
      <li><strong>Chain stitch (ch):</strong> The starting point for most crochet projects</li>
      <li><strong>Single crochet (sc):</strong> A tight, dense stitch perfect for amigurumi</li>
      <li><strong>Double crochet (dc):</strong> A taller stitch that works up quickly</li>
      <li><strong>Slip stitch (sl st):</strong> Used for joining and moving across your work</li>
    </ul>

    <h2>Practice Makes Perfect</h2>
    <p>Don't be discouraged if your first attempts aren't perfect. Crochet is a skill that improves with practice. Start with simple projects like dishcloths or scarves before moving on to more complex patterns.</p>

    <p>Join our community of makers and share your crochet journey with us!</p>
  `,
  coverImage: '/images/blog1.jpg',
  author: 'Jane Doe',
  publishedAt: '2024-01-15T10:00:00Z',
};

export default function BlogPostPage() {
  const router = useRouter();
  const { slug } = router.query;

  return (
    <MainLayout title={`${mockPost.title} - Yarnitt Blog`}>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <button
          onClick={() => router.push('/blog')}
          className="flex items-center space-x-2 text-gray-600 hover:text-brown-600 mb-8"
        >
          <ArrowLeft size={20} />
          <span>Back to Blog</span>
        </button>

        <article>
          {mockPost.coverImage && (
            <div className="rounded-card overflow-hidden mb-8 aspect-video bg-gray-100">
              <img
                src={mockPost.coverImage}
                alt={mockPost.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <h1 className="text-4xl font-bold mb-4">{mockPost.title}</h1>

          <div className="flex items-center space-x-6 text-gray-600 mb-8 pb-8 border-b">
            <div className="flex items-center space-x-2">
              <Calendar size={18} />
              <span>{formatDate(mockPost.publishedAt)}</span>
            </div>
            <div className="flex items-center space-x-2">
              <User size={18} />
              <span>{mockPost.author}</span>
            </div>
          </div>

          <div 
            className="prose prose-lg max-w-none"
            dangerouslySetInnerHTML={{ __html: mockPost.content }}
          />
        </article>
      </div>
    </MainLayout>
  );
}
