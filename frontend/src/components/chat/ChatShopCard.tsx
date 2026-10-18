import { Link } from 'react-router-dom'
import { getImageUrl } from '../../services/coffeeShop'
import type { ChatShop } from '../../services/chat'

function statusBadge(status?: ChatShop['openStatus']) {
  if (status === 'buka') {
    return { label: 'Buka', className: 'bg-success-soft text-success' }
  }
  if (status === 'tutup') {
    return { label: 'Tutup', className: 'bg-danger-soft text-danger' }
  }
  // 'tidak_diketahui' (atau status tak tersedia) jangan dipaksa jadi "Tutup".
  return { label: 'Jam buka belum pasti', className: 'bg-info-soft text-muted' }
}

export default function ChatShopCard({ shop }: { shop: ChatShop }) {
  const imageUrl = getImageUrl(shop.image)
  const badge = statusBadge(shop.openStatus)

  return (
    <Link
      to={`/coffee-shops/${shop.slug}`}
      className="flex gap-3 rounded-xl border border-subtle bg-surface p-2.5 shadow-xs transition hover:border-terracotta hover:bg-surface-hover"
    >
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={shop.name}
          loading="lazy"
          className="h-14 w-14 shrink-0 rounded-lg object-cover"
        />
      ) : (
        <div
          aria-hidden
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-info-soft text-xl"
        >
          ☕
        </div>
      )}

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <b className="truncate text-sm text-heading">{shop.name}</b>
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${badge.className}`}>
            {badge.label}
          </span>
        </div>

        <p className="mt-0.5 truncate text-xs font-medium text-body">{shop.district}</p>

        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] font-medium text-muted">
          {shop.rating !== null && shop.rating !== undefined ? (
            <span className="font-bold text-terracotta-strong">
              ★ {shop.rating.toFixed(1)} <span className="font-medium text-muted">({shop.reviewCount} ulasan)</span>
            </span>
          ) : (
            <span>Belum ada ulasan</span>
          )}
          {shop.distanceKm !== undefined && (
            <span className="font-mono font-bold text-terracotta-strong">📍 {shop.distanceKm} km</span>
          )}
        </div>

        <p className="mt-0.5 truncate text-xs font-semibold text-heading">{shop.priceRange}</p>
      </div>
    </Link>
  )
}