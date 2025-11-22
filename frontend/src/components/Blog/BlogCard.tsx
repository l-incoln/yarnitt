import React from 'react';
import Link from 'next/link';
import { Calendar, User } from 'lucide-react';
import type { BlogPost } from '@/types';
import { formatDate, truncateText } from '@/lib/utils';

interface BlogCardProps {
  post: BlogPost;
}

export default function BlogCard({ post }: BlogCardProps) {
  return (
    <Link href={`/blog/${post.slug}`}>
      <div className="card group cursor-pointer hover:shadow-hover transition-shadow">
        {post.coverImage && (
          <div className="relative overflow-hidden rounded-md mb-4 aspect-video bg-gray-100">
            <img
              src={post.coverImage}
              alt={post.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          </div>
        )}

        <h3 className="font-bold text-xl mb-2 group-hover:text-brown-600 transition-colors">
          {post.title}
        </h3>

        <div className="flex items-center space-x-4 text-sm text-gray-600 mb-3">
          <div className="flex items-center space-x-1">
            <Calendar size={14} />
            <span>{formatDate(post.publishedAt)}</span>
          </div>
          <div className="flex items-center space-x-1">
            <User size={14} />
            <span>{post.author}</span>
          </div>
        </div>

        <p className="text-gray-700 mb-4">
          {truncateText(post.excerpt, 150)}
        </p>

        <span className="text-brown-600 font-medium hover:text-brown-700">
          Read more →
        </span>
      </div>
    </Link>
  );
}
