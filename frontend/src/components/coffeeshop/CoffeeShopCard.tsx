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
        className="card-elevation group flex flex-col overflow-hidden rounded-2xl border border-subtle bg-white transition-all duration-300 hover:border-terracotta h-full"
      >
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-info-soft">
          <img
            src={coffeeShop.imageUrl}
            alt={coffeeShop.name}
            loading="lazy"
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          />
          {coffeeShop.isFeatured && (
            <span className="absolute left-3 top-3 rounded-full bg-terracotta px-3 py-1 font-mono text-[11px] font-bold text-white shadow-md tracking-wider uppercase">
              Featured
            </span>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-2 p-4">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-heading">
              {coffeeShop.name}
            </h3>
            <div className="flex shrink-0 items-center gap-1 text-sm font-semibold text-heading">
              <span aria-hidden className="text-terracotta">★</span>
              {coffeeShop.rating.toFixed(1)}
              <span className="text-muted">({coffeeShop.reviewCount})</span>
            </div>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-body">{coffeeShop.district}</span>
            {coffeeShop.distance !== undefined && (
              <span className="font-mono text-xs font-bold text-terracotta-strong bg-accent-soft px-2.5 py-1 rounded-full border border-terracotta/20">
                📍 {coffeeShop.distance} km
              </span>
            )}
          </div>

          <p className="text-sm font-semibold text-heading">
            {coffeeShop.priceRange}
          </p>

          <div className="mt-1 flex flex-wrap gap-1.5">
            {coffeeShop.facilities.slice(0, 3).map((facility) => (
              <span
                key={facility}
                className="rounded-full bg-info-soft px-2.5 py-1 text-xs font-semibold text-body"
              >
                {facility}
              </span>
            ))}
          </div>

          <span className="mt-auto pt-2 font-mono text-xs font-bold text-terracotta group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
            Lihat Detail →
          </span>
        </div>
      </Link>
    </motion.div>
  );
}