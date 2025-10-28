import Head from "next/head";
import React from "react";
import ProductCard from "../components/ProductCard";

const MOCK = [
  { id: "11111111-1111-1111-1111-111111111111", title: "Creme Baby Blanket", price: 3200, images: [{ url: "/uploads/sample1.jpg", thumbnail_url: "/uploads/sample1-thumb.jpg" }], is_sponsored: true }
];

export default function HomePage() {
  function openProduct(id: string) { window.location.href = `/product/${id}`; }

  return (
    <>
      <Head><title>Yarnitt — Handmade. Heartmade.</title></Head>
      <main className="max-w-7xl mx-auto px-4">
        <header className="py-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Yarnitt</h1>
          <nav className="flex items-center space-x-4">
            <a className="text-sm text-gray-600">Login</a>
            <button className="btn-primary">Sell</button>
          </nav>
        </header>

        <section className="my-6 card">
          <h2 className="text-3xl font-bold">Handmade. Heartmade. Yarnitt.</h2>
          <p className="mt-2 text-gray-600">Discover crochet goods from Kenyan artisans.</p>
        </section>

        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {MOCK.map((p) => {
            const img = p.images && p.images[0];
            return <ProductCard key={p.id} id={p.id} title={p.title} price={p.price} image={img?.url} thumbnail={img?.thumbnail_url} isSponsored={p.is_sponsored} onClick={openProduct} />;
          })}
        </section>
      </main>
    </>
  );
}