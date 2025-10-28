import React from "react";

export type ProductCardProps = {
  id: string;
  title: string;
  price: number;
  currency?: string;
  image?: string;
  thumbnail?: string | null;
  isSponsored?: boolean;
  onClick?: (id: string) => void;
};

export default function ProductCard({
  id,
  title,
  price,
  currency = "KES",
  image,
  thumbnail,
  isSponsored,
  onClick
}: ProductCardProps) {
  const preview = thumbnail || image || "/images/placeholder-card.jpg";

  return (
    <article
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onClick?.(id); }}
      onClick={() => onClick?.(id)}
      className="group card interactive-hover cursor-pointer focus-visible:kbd-focus"
      aria-labelledby={`product-${id}-title`}
    >
      <div className="relative overflow-hidden rounded-md">
        <div style={{
          backgroundImage: `url(${preview})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          width: '100%',
          height: 220
        }} />
        {isSponsored && <span className="absolute top-3 left-3 badge-sponsored">Sponsored</span>}
      </div>

      <div className="mt-3">
        <h3 id={`product-${id}-title`} className="text-md font-medium truncate">{title}</h3>
        <div className="mt-2 flex items-center justify-between">
          <div className="text-sm text-gray-600">{currency} {price.toLocaleString()}</div>
          <button className="ml-3 btn-primary text-sm px-3 py-1 rounded">Add</button>
        </div>
      </div>
    </article>
  );
}