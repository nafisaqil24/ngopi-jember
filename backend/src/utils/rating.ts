export interface RatingSourceInfo {
  rating: number | null
  reviewCount: number
  ratingSource: 'google' | 'ulasan' | null
  ratingAt: Date | null
  googleRating: number | null
  googleReviewCount: number | null
  googleRatingAt: Date | null
}

export function getEffectiveRating(shop: {
  googleRating?: number | null
  googleReviewCount?: number | null
  googleRatingAt?: Date | string | null
  reviews?: { rating: number }[]
  _count?: { reviews?: number }
}): RatingSourceInfo {
  const gRating = shop.googleRating ?? null
  const gReviewCount = shop.googleReviewCount ?? 0
  const gRatingAt = shop.googleRatingAt ? new Date(shop.googleRatingAt) : null

  if (gRating !== null && gRating !== undefined && !isNaN(gRating)) {
    return {
      rating: gRating,
      reviewCount: gReviewCount,
      ratingSource: 'google',
      ratingAt: gRatingAt,
      googleRating: gRating,
      googleReviewCount: gReviewCount,
      googleRatingAt: gRatingAt,
    }
  }

  const reviews = shop.reviews ?? []
  if (reviews.length > 0) {
    const sum = reviews.reduce((acc, r) => acc + r.rating, 0)
    const avg = sum / reviews.length
    const rounded = Math.round(avg * 10) / 10
    return {
      rating: rounded,
      reviewCount: reviews.length,
      ratingSource: 'ulasan',
      ratingAt: null,
      googleRating: null,
      googleReviewCount: null,
      googleRatingAt: null,
    }
  }

  const countReviews = shop._count?.reviews ?? 0
  if (countReviews > 0) {
    // If only count is available (e.g. from count query without review array)
    // We cannot compute avg without review ratings unless passed, but usually reviews array is selected.
  }

  return {
    rating: null,
    reviewCount: shop._count?.reviews ?? 0,
    ratingSource: null,
    ratingAt: null,
    googleRating: null,
    googleReviewCount: null,
    googleRatingAt: null,
  }
}
