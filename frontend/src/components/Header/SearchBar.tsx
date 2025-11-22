import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { useRouter } from 'next/router';

export default function SearchBar() {
  const [query, setQuery] = useState('');
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/shop?search=${encodeURIComponent(query)}`);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="relative flex-1 max-w-2xl mx-4">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search for handmade goods..."
        className="searchbar pr-12"
      />
      <button
        type="submit"
        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-gray-500 hover:text-brown-600"
      >
        <Search size={20} />
      </button>
    </form>
  );
}
