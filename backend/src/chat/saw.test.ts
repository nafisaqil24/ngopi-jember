import { describe, it, expect } from 'vitest'
import { calculateSAW, resolveWeights, DEFAULT_WEIGHTS, SawShopInput } from './saw.service.js'

describe('SAW Service (Simple Additive Weighting)', () => {
  describe('resolveWeights', () => {
    it('(a) tanpa priorities mengembalikan DEFAULT_WEIGHTS persis sama', () => {
      const weights = resolveWeights(true, undefined, {
        distance: true,
        price: true,
        rating: true,
        facility: true,
      })
      expect(weights).toEqual(DEFAULT_WEIGHTS)
    })

    it('(b) satu prioritas "tinggi" mengubah bobot sesuai rumus pengali dan normalisasi', () => {
      // price default 0.25, tinggi multiplier 2 -> 0.50
      // distance: 0.30, rating: 0.30, facility: 0.15
      // total = 0.30 + 0.50 + 0.30 + 0.15 = 1.25
      // normalized: distance = 0.30/1.25 = 0.24, price = 0.50/1.25 = 0.40, rating = 0.30/1.25 = 0.24, facility = 0.15/1.25 = 0.12
      const weights = resolveWeights(true, { price: 'tinggi' }, {
        distance: true,
        price: true,
        rating: true,
        facility: true,
      })
      expect(weights.price).toBeCloseTo(0.40, 4)
      expect(weights.distance).toBeCloseTo(0.24, 4)
      expect(weights.rating).toBeCloseTo(0.24, 4)
      expect(weights.facility).toBeCloseTo(0.12, 4)
      
      const sum = weights.distance + weights.price + weights.rating + weights.facility
      expect(sum).toBeCloseTo(1.0, 5)
    })

    it('menghapus kriteria jarak jika includeDistance=false dan menormalisasi ulang', () => {
      // Tanpa distance: price 0.25, rating 0.30, facility 0.15 -> total 0.70
      // normalisasi: price = 0.25/0.70 = 0.3571, rating = 0.30/0.70 = 0.4286, facility = 0.15/0.70 = 0.2143
      const weights = resolveWeights(false, undefined, {
        distance: false,
        price: true,
        rating: true,
        facility: true,
      })
      expect(weights.distance).toBeUndefined()
      expect(weights.price).toBeCloseTo(0.25 / 0.70, 4)
      expect(weights.rating).toBeCloseTo(0.30 / 0.70, 4)
      expect(weights.facility).toBeCloseTo(0.15 / 0.70, 4)
    })
  })

  describe('calculateSAW - Perhitungan Manual 3 Kedai', () => {
    /*
     * Perhitungan Manual:
     * Kedai A: distance 2, price 20000, rating 4.0, facility 3
     * Kedai B: distance 5, price 10000, rating 5.0, facility 1
     * Kedai C: distance 1, price 40000, rating 3.0, facility 5
     * 
     * Kriteria & Bobot (DEFAULT): distance 0.30 (Cost), price 0.25 (Cost), rating 0.30 (Benefit), facility 0.15 (Benefit)
     * Min distance = 1 (C), Min price = 10000 (B), Max rating = 5 (B), Max facility = 5 (C)
     * 
     * Normalisasi R:
     * - Distance (Cost: min/x): A=1/2=0.5, B=1/5=0.2, C=1/1=1.0
     * - Price (Cost: min/x): A=10k/20k=0.5, B=10k/10k=1.0, C=10k/40k=0.25
     * - Rating (Benefit: x/max): A=4/5=0.8, B=5/5=1.0, C=3/5=0.6
     * - Facility (Benefit: x/max): A=3/5=0.6, B=1/5=0.2, C=5/5=1.0
     * 
     * Skor Preferensi V = sum(R * W):
     * - A = (0.5 * 0.30) + (0.5 * 0.25) + (0.8 * 0.30) + (0.6 * 0.15)
     *     = 0.15 + 0.125 + 0.24 + 0.09 = 0.605
     * - B = (0.2 * 0.30) + (1.0 * 0.25) + (1.0 * 0.30) + (0.2 * 0.15)
     *     = 0.06 + 0.25 + 0.30 + 0.03 = 0.64
     * - C = (1.0 * 0.30) + (0.25 * 0.25) + (0.6 * 0.30) + (1.0 * 0.15)
     *     = 0.30 + 0.0625 + 0.18 + 0.15 = 0.6925
     * 
     * Urutan: C (0.6925) > B (0.64) > A (0.605)
     */
    it('menghasilkan urutan dan skor yang sesuai perhitungan manual', () => {
      const shops: SawShopInput[] = [
        { slug: 'kedai-a', distanceKm: 2, priceMidpoint: 20000, rating: 4.0, facilityCount: 3 },
        { slug: 'kedai-b', distanceKm: 5, priceMidpoint: 10000, rating: 5.0, facilityCount: 1 },
        { slug: 'kedai-c', distanceKm: 1, priceMidpoint: 40000, rating: 3.0, facilityCount: 5 },
      ]

      const result = calculateSAW(shops, true)
      expect(result.length).toBe(3)
      expect(result[0].slug).toBe('kedai-c')
      expect(result[0].score).toBeCloseTo(0.6925, 4)
      expect(result[1].slug).toBe('kedai-b')
      expect(result[1].score).toBeCloseTo(0.64, 4)
      expect(result[2].slug).toBe('kedai-a')
      expect(result[2].score).toBeCloseTo(0.605, 4)
    })
  })

  describe('calculateSAW - Penanganan Data Kosong', () => {
    it('(c) menangani harga null, rating null, dan kriteria yang seluruhnya kosong (dibuang & bobot dinormalisasi)', () => {
      // Kedai dengan harga null dan rating null
      const shops: SawShopInput[] = [
        { slug: 'kedai-x', distanceKm: 2, priceMidpoint: null, rating: null, facilityCount: 2 },
        { slug: 'kedai-y', distanceKm: 4, priceMidpoint: null, rating: null, facilityCount: 4 },
      ]

      // Karena semua price null dan semua rating null (rating 0), kriteria price dan rating dibuang.
      // Kriteria aktif tinggal distance dan facility. Bobot masing-masing dinormalisasi jadi 0.5 dan 0.5.
      // Karena harga dan rating kosong, kriteria price dan rating dibuang.
      // Kriteria aktif tinggal distance (bobot default 0.30) dan fasilitas (bobot default 0.15).
      // Setelah dinormalisasi ulang: distance = 0.30 / 0.45 = 0.6667, facility = 0.15 / 0.45 = 0.3333.
      // X: dist 2, facility 2 -> norm dist = 2/2 = 1.0, norm facility = 2/4 = 0.5
      //    Score X = (1.0 * 0.6667) + (0.5 * 0.3333) = 0.6667 + 0.1667 = 0.8333
      // Y: dist 4, facility 4 -> norm dist = 2/4 = 0.5, norm facility = 4/4 = 1.0
      //    Score Y = (0.5 * 0.6667) + (1.0 * 0.3333) = 0.3333 + 0.3333 = 0.6667
      const result = calculateSAW(shops, true)
      expect(result.length).toBe(2)
      expect(result[0].slug).toBe('kedai-x')
      expect(result[0].score).toBeCloseTo(0.8333, 3)
      expect(result[1].slug).toBe('kedai-y')
      expect(result[1].score).toBeCloseTo(0.6667, 3)
    })
  })
})
