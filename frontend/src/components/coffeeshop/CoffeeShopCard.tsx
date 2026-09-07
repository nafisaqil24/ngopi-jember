import { Link } from "react-router-dom";
import type { CoffeeShop } from "../../types/coffeeShop";

// Komponen ini menerima satu object CoffeeShop lewat props, lalu
// merender tampilannya sebagai kartu. Dengan begini, kartu yang sama
// bisa dipakai berulang kali di halaman Home (untuk populer/featured/
// terbaru) maupun nanti di halaman Explorer, cukup dengan mengoper
// data yang berbeda-beda.
//
// CATATAN PERBAIKAN: warna diganti dari coffee-100/coffee-300/coffee-900/
// accent-500/accent-600 (tidak terdaftar di @theme index.css) menjadi
// espresso/cream/terracotta yang valid.

interface CoffeeShopCardProps {
  coffeeShop: CoffeeShop;
}

export default function CoffeeShopCard({ coffeeShop }: CoffeeShopCardProps) {
  return (
    <Link
      to={`/coffee-shops/${coffeeShop.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-espresso/10 bg-white transition hover:-translate-y-1 hover:shadow-lg"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-cream">
        <img
          src={coffeeShop.imageUrl}
          alt={coffeeShop.name}
          loading="lazy"
          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
        />
        {coffeeShop.isFeatured && (
          <span className="absolute left-3 top-3 rounded-full bg-terracotta px-3 py-1 text-xs font-semibold text-white">
            Featured
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-espresso">
            {coffeeShop.name}
          </h3>
          <div className="flex shrink-0 items-center gap-1 text-sm font-medium text-espresso/80">
            <span aria-hidden>★</span>
            {coffeeShop.rating.toFixed(1)}
            <span className="text-espresso/40">({coffeeShop.reviewCount})</span>
          </div>
        </div>

        <p className="text-sm text-espresso/60">{coffeeShop.district}</p>

        <p className="text-sm font-medium text-espresso/80">
          {coffeeShop.priceRange}
        </p>

        <div className="mt-1 flex flex-wrap gap-1.5">
          {coffeeShop.facilities.slice(0, 3).map((facility) => (
            <span
              key={facility}
              className="rounded-full bg-cream px-2.5 py-1 text-xs text-espresso/70"
            >
              {facility}
            </span>
          ))}
        </div>

        <span className="mt-auto pt-2 text-sm font-semibold text-terracotta">
          Lihat Detail
        </span>
      </div>
    </Link>
  );
}