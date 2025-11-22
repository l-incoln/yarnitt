import React from 'react';
import Link from 'next/link';
import { ShoppingCart, User, Menu } from 'lucide-react';
import SearchBar from './SearchBar';
import { useAuthStore } from '@/store/authStore';
import { useCartStore } from '@/store/cartStore';

export default function Header() {
  const { isAuthenticated, user } = useAuthStore();
  const itemCount = useCartStore((state) => state.getItemCount());

  return (
    <header className="header">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between gap-4">
          {/* Logo */}
          <Link href="/" className="text-2xl font-bold text-brown-700 hover:text-brown-800 whitespace-nowrap">
            Yarnitt
          </Link>

          {/* Search Bar - Hidden on mobile */}
          <div className="hidden md:flex flex-1">
            <SearchBar />
          </div>

          {/* Right Side Icons */}
          <div className="flex items-center space-x-4">
            {/* User Menu */}
            {isAuthenticated ? (
              <div className="relative group">
                <button className="flex items-center space-x-2 text-gray-700 hover:text-brown-600">
                  <User size={24} />
                  <span className="hidden sm:inline text-sm">{user?.name || 'Account'}</span>
                </button>
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-card shadow-card py-2 hidden group-hover:block">
                  <Link href="/orders" className="block px-4 py-2 text-sm hover:bg-gray-100">
                    My Orders
                  </Link>
                  <Link href="/profile" className="block px-4 py-2 text-sm hover:bg-gray-100">
                    Profile
                  </Link>
                  <button
                    onClick={() => useAuthStore.getState().logout()}
                    className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                  >
                    Logout
                  </button>
                </div>
              </div>
            ) : (
              <Link href="/auth/login" className="flex items-center space-x-1 text-gray-700 hover:text-brown-600">
                <User size={24} />
                <span className="hidden sm:inline text-sm">Login</span>
              </Link>
            )}

            {/* Cart */}
            <Link href="/cart" className="relative text-gray-700 hover:text-brown-600">
              <ShoppingCart size={24} />
              {itemCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-brown-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {itemCount}
                </span>
              )}
            </Link>

            {/* Mobile Menu */}
            <button className="md:hidden text-gray-700 hover:text-brown-600">
              <Menu size={24} />
            </button>
          </div>
        </div>

        {/* Mobile Search Bar */}
        <div className="md:hidden mt-4">
          <SearchBar />
        </div>
      </div>
    </header>
  );
}
