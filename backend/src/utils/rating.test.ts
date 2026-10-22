import { describe, it, expect } from 'vitest'
import { getEffectiveRating } from './rating.js'

describe('getEffectiveRating', () => {
  it('menggunakan googleRating jika terisi', () => {
    const shop = {
      googleRating: 4.5,
      googleReviewCount: 150,
      googleRatingAt: new Date('2026-10-22'),
      reviews: [{ rating: 3 }, { rating: 4 }]
    }
    const result = getEffectiveRating(shop)
    expect(result.rating).toBe(4.5)
    expect(result.reviewCount).toBe(150)
    expect(result.ratingSource).toBe('google')
    expect(result.ratingAt).toEqual(new Date('2026-10-22'))
  })

  it('menggunakan rata-rata ulasan jika googleRating null/absent dan ada review', () => {
    const shop = {
      googleRating: null,
      googleReviewCount: null,
      googleRatingAt: null,
      reviews: [{ rating: 4 }, { rating: 5 }]
    }
    const result = getEffectiveRating(shop)
    expect(result.rating).toBe(4.5)
    expect(result.reviewCount).toBe(2)
    expect(result.ratingSource).toBe('ulasan')
    expect(result.ratingAt).toBeNull()
  })

  it('mengembalikan null jika googleRating null dan tidak ada review', () => {
    const shop = {
      googleRating: null,
      googleReviewCount: null,
      googleRatingAt: null,
      reviews: []
    }
    const result = getEffectiveRating(shop)
    expect(result.rating).toBeNull()
    expect(result.reviewCount).toBe(0)
    expect(result.ratingSource).toBeNull()
    expect(result.ratingAt).toBeNull()
  })
})
