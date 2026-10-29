import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import type { CoffeeShop } from "../../types/coffeeShop";
import { formatRating, hasRating } from "../../utils/rating";

interface CoffeeShopCardProps {
  coffeeShop: CoffeeShop;
  index?: number;
}

export default function CoffeeShopCard({ coffeeShop, index = 0 }: CoffeeShopCardProps) {
  const ratingAvailable = hasRating(coffeeShop.rating, coffeeShop.reviewCount, coffeeShop.ratingSource);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.4, delay: index * 0.08, ease: "easeOut" }}
      className={`relative rounded-[4px] ${coffeeShop.isFeatured ? "p-[2px] animated-gradient-border shadow-lg" : ""}`}
    >
      <Link
        to={`/coffee-shops/${coffeeShop.slug}`}
        className="group flex flex-col overflow-hidden rounded-[4px] border border-card-border bg-card-bg shadow-card hover:shadow-card-hover transition-shadow duration-200 h-full"
      >
        <div className="relative aspect-[16/10] w-full overflow-hidden bg-info-soft">
          <img
            src={coffeeShop.imageUrl}
            alt={coffeeShop.name}
            loading="lazy"
            className="h-full w-full rounded-t-[4px] object-cover transition duration-300 group-hover:scale-105"
          />
          {coffeeShop.isFeatured && (
            <span className="absolute left-3 top-3 rounded-full bg-terracotta px-2.5 py-1 font-mono text-xs font-bold text-white shadow-md tracking-wider uppercase">
              Featured
            </span>
          )}
          {coffeeShop.openStatus && (
            <span
              className={`badge-status absolute bottom-3 left-3 px-2.5 py-1 ${
                coffeeShop.openStatus === "buka"
                  ? "badge-status--open"
                  : coffeeShop.openStatus === "tutup"
                  ? "badge-status--closed"
                  : "badge-status--unknown"
              }`}
            >
              <span className="badge-dot" />
              {coffeeShop.openStatus === "buka"
                ? "Buka"
                : coffeeShop.openStatus === "tutup"
                ? "Tutup"
                : "Jam belum pasti"}
            </span>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-1.5 p-4">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-base font-semibold text-heading">
              {coffeeShop.name}
            </h3>
            {ratingAvailable ? (
              <div className="flex shrink-0 items-center gap-1 text-sm font-semibold text-heading">
                <span aria-hidden className="text-terracotta">★</span>
                {formatRating(coffeeShop.rating, coffeeShop.reviewCount, coffeeShop.ratingSource)}
                <span className="text-muted">({coffeeShop.reviewCount})</span>
              </div>
            ) : (
              <span className="shrink-0 text-xs font-semibold text-muted">Belum ada rating</span>
            )}
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

          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {coffeeShop.facilities.slice(0, 3).map((facility) => (
              <span key={facility} className="chip text-xs px-2.5 py-1 bg-white border-card-border">
                {facility}
              </span>
            ))}
          </div>

          <span className="mt-auto pt-1.5 font-mono text-xs font-bold text-terracotta group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
            Lihat Detail →
          </span>
        </div>
      </Link>
    </motion.div>
  );
}