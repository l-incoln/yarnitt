import React from 'react';
import MainLayout from '@/layouts/MainLayout';
import { Heart, Users, Globe, Award } from 'lucide-react';

export default function AboutPage() {
  return (
    <MainLayout title="About Us - Yarnitt">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold mb-6 text-brown-700">
            About Yarnitt
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Connecting talented Kenyan artisans with the world through beautiful, handmade crochet goods
          </p>
        </div>

        {/* Mission Statement */}
        <div className="card mb-12 bg-brown-50 border-2 border-brown-100">
          <div className="text-center py-8">
            <h2 className="text-3xl font-bold mb-4">Our Mission</h2>
            <p className="text-lg text-gray-700 max-w-3xl mx-auto">
              To empower local artisans by providing a platform to showcase their craftsmanship, 
              while bringing unique, sustainable, and lovingly made products to customers worldwide.
            </p>
          </div>
        </div>

        {/* Values */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
          <div className="card text-center">
            <div className="w-16 h-16 bg-brown-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Heart size={32} className="text-brown-600" />
            </div>
            <h3 className="font-bold text-lg mb-2">Handmade with Love</h3>
            <p className="text-gray-600 text-sm">
              Every piece is crafted with care and attention to detail
            </p>
          </div>

          <div className="card text-center">
            <div className="w-16 h-16 bg-brown-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users size={32} className="text-brown-600" />
            </div>
            <h3 className="font-bold text-lg mb-2">Supporting Artisans</h3>
            <p className="text-gray-600 text-sm">
              Fair compensation for talented makers in our community
            </p>
          </div>

          <div className="card text-center">
            <div className="w-16 h-16 bg-brown-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Globe size={32} className="text-brown-600" />
            </div>
            <h3 className="font-bold text-lg mb-2">Sustainable</h3>
            <p className="text-gray-600 text-sm">
              Eco-friendly materials and practices that protect our planet
            </p>
          </div>

          <div className="card text-center">
            <div className="w-16 h-16 bg-brown-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Award size={32} className="text-brown-600" />
            </div>
            <h3 className="font-bold text-lg mb-2">Quality First</h3>
            <p className="text-gray-600 text-sm">
              High standards for every product that bears our name
            </p>
          </div>
        </div>

        {/* Story */}
        <div className="card mb-12">
          <h2 className="text-3xl font-bold mb-6">Our Story</h2>
          <div className="space-y-4 text-gray-700">
            <p>
              Yarnitt was born from a simple observation: Kenya is home to incredibly talented 
              artisans creating beautiful crochet goods, but many lacked a platform to reach 
              customers beyond their local communities.
            </p>
            <p>
              We started Yarnitt to bridge this gap. By creating an online marketplace 
              specifically for handmade crochet items, we're helping artisans build sustainable 
              businesses while giving customers access to unique, high-quality products they 
              won't find anywhere else.
            </p>
            <p>
              Today, Yarnitt is proud to support a growing network of makers across Kenya. 
              Every purchase you make helps an artisan earn a fair income, support their family, 
              and continue practicing their craft.
            </p>
          </div>
        </div>

        {/* Call to Action */}
        <div className="card text-center bg-brown-700 text-white">
          <h2 className="text-3xl font-bold mb-4">Join Our Community</h2>
          <p className="text-lg mb-6 opacity-90">
            Whether you're a buyer looking for unique handmade goods or an artisan 
            wanting to share your creations, we'd love to have you.
          </p>
          <div className="flex justify-center space-x-4">
            <button
              onClick={() => window.location.href = '/shop'}
              className="bg-white text-brown-700 px-6 py-3 rounded-button font-medium hover:bg-brown-50"
            >
              Start Shopping
            </button>
            <button
              onClick={() => window.location.href = '/auth/register'}
              className="bg-brown-600 text-white px-6 py-3 rounded-button font-medium hover:bg-brown-500"
            >
              Become a Seller
            </button>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
