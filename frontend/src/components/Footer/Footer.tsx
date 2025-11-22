import React from 'react';
import Link from 'next/link';
import { Facebook, Instagram, Twitter, Mail, Phone } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-white mt-12 border-t border-gray-200">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* About */}
          <div>
            <h3 className="font-bold text-lg mb-4 text-brown-700">Yarnitt</h3>
            <p className="text-sm text-gray-600">
              Discover beautiful handmade crochet goods from talented Kenyan artisans.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/shop" className="text-gray-600 hover:text-brown-600">
                  Shop
                </Link>
              </li>
              <li>
                <Link href="/about" className="text-gray-600 hover:text-brown-600">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/blog" className="text-gray-600 hover:text-brown-600">
                  Blog
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-gray-600 hover:text-brown-600">
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          {/* Customer Service */}
          <div>
            <h4 className="font-semibold mb-4">Customer Service</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/orders" className="text-gray-600 hover:text-brown-600">
                  My Orders
                </Link>
              </li>
              <li>
                <Link href="/shipping" className="text-gray-600 hover:text-brown-600">
                  Shipping Info
                </Link>
              </li>
              <li>
                <Link href="/returns" className="text-gray-600 hover:text-brown-600">
                  Returns
                </Link>
              </li>
              <li>
                <Link href="/faq" className="text-gray-600 hover:text-brown-600">
                  FAQ
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact & Social */}
          <div>
            <h4 className="font-semibold mb-4">Connect With Us</h4>
            <div className="space-y-2 text-sm text-gray-600 mb-4">
              <div className="flex items-center space-x-2">
                <Mail size={16} />
                <span>hello@yarnitt.com</span>
              </div>
              <div className="flex items-center space-x-2">
                <Phone size={16} />
                <span>+254 700 000 000</span>
              </div>
            </div>
            <div className="flex space-x-4">
              <a href="#" className="text-gray-600 hover:text-brown-600">
                <Facebook size={20} />
              </a>
              <a href="#" className="text-gray-600 hover:text-brown-600">
                <Instagram size={20} />
              </a>
              <a href="#" className="text-gray-600 hover:text-brown-600">
                <Twitter size={20} />
              </a>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-gray-200 text-center text-sm text-gray-600">
          <p>&copy; {new Date().getFullYear()} Yarnitt. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
