import { describe, it, expect } from 'vitest'
import { computeDistanceMetrics } from './search.service.js'
import { calculateSAW } from './saw.service.js'

describe('Jarak sebelum SAW', () => {
  it('memakai jarak asli (tanpa pembulatan) untuk normalisasi SAW', () => {
    const user = { lat: -8.17, lng: 113.7 }
    // 1 derajat lintang kira-kira 111.32 km.
    const north = (km: number) => ({
      latitude: -8.17 + km / 111.32,
      longitude: 113.7,
    })

    const a = computeDistanceMetrics(user, north(0.04))
    const b = computeDistanceMetrics(user, north(0.3))
    const c = computeDistanceMetrics(user, north(3))

    // Nilai tampilan tetap dibulatkan 1 desimal.
    expect(a.distanceKm).toBe(0)
    expect(b.distanceKm).toBe(0.3)
    expect(c.distanceKm).toBe(3)

    // Nilai mentah tidak boleh ikut dibulatkan.
    expect(a.distanceKmRaw).toBeCloseTo(0.04, 2)
    expect(b.distanceKmRaw).toBeCloseTo(0.3, 2)
    expect(c.distanceKmRaw).toBeCloseTo(3, 2)

    const result = calculateSAW(
      [
        { slug: 'a', distanceKm: a.distanceKmRaw, priceMidpoint: 20000, rating: 4, facilityCount: 1 },
        { slug: 'b', distanceKm: b.distanceKmRaw, priceMidpoint: 20000, rating: 4, facilityCount: 1 },
        { slug: 'c', distanceKm: c.distanceKmRaw, priceMidpoint: 20000, rating: 4, facilityCount: 1 },
      ],
      true
    )

    const normalized = Object.fromEntries(
      result.map((item) => [item.slug, item.details.distance!.normalized])
    )

    // 0,04/0,04 = 1; 0,04/0,3 ~ 0,133; 0,04/3 ~ 0,013
    expect(normalized.a).toBeCloseTo(1, 3)
    expect(normalized.b).toBeCloseTo(a.distanceKmRaw! / b.distanceKmRaw!, 3)
    expect(normalized.c).toBeCloseTo(a.distanceKmRaw! / c.distanceKmRaw!, 3)

    // Bukti bug lama (1, 0, 0) tidak lagi terjadi.
    expect(normalized.b).toBeGreaterThan(0.1)
    expect(normalized.c).toBeGreaterThan(0)
  })
})