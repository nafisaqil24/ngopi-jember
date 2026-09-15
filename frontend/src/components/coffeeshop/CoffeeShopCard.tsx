import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import type { CoffeeShop } from "../../types/coffeeShop";

interface CoffeeShopCardProps {
  coffeeShop: CoffeeShop;
  index?: number;
}

export default function CoffeeShopCard({ coffeeShop, index = 0 }: CoffeeShopCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.4, delay: index * 0.08, ease: "easeOut" }}
      className={`relative rounded-2xl ${coffeeShop.isFeatured ? "p-[2px] animated-gradient-border shadow-lg" : ""}`}
    >
      <Link
        to={`/coffee-shops/${coffeeShop.slug}`}
        className="card-elevation group flex flex-col overflow-hidden rounded-2xl border border-slate-300 bg-white transition-all duration-300 hover:border-indigo-600 h-full"
      >
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100">
          <img
            src={coffeeShop.imageUrl}
            alt={coffeeShop.name}
            loading="lazy"
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          />
          {coffeeShop.isFeatured && (
            <span className="absolute left-3 top-3 rounded-lg bg-indigo-600 px-3 py-1 font-mono text-[11px] font-bold text-white shadow-md tracking-wider uppercase">
              Featured
            </span>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-2 p-4">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-slate-900">
              {coffeeShop.name}
            </h3>
            <div className="flex shrink-0 items-center gap-1 text-sm font-semibold text-slate-900">
              <span aria-hidden>★</span>
              {coffeeShop.rating.toFixed(1)}
              <span className="text-slate-700">({coffeeShop.reviewCount})</span>
            </div>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-slate-700">{coffeeShop.district}</span>
            {coffeeShop.distance !== undefined && (
              <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-500/20">
                📍 {coffeeShop.distance} km
              </span>
            )}
          </div>

          <p className="text-sm font-semibold text-slate-900">
            {coffeeShop.priceRange}
          </p>

          <div className="mt-1 flex flex-wrap gap-1.5">
            {coffeeShop.facilities.slice(0, 3).map((facility) => (
              <span
                key={facility}
                className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-800"
              >
                {facility}
              </span>
            ))}
          </div>

          <span className="mt-auto pt-2 font-mono text-xs font-bold text-indigo-600 group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
            Lihat Detail →
          </span>
        </div>
      </Link>
    </motion.div>
  );
}