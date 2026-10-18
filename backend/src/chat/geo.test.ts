import { describe, it, expect } from 'vitest'
import { isWithinJember, calculateDistance, JEMBER_LAT_MIN, JEMBER_LAT_MAX, JEMBER_LNG_MIN, JEMBER_LNG_MAX } from './geo.js'

describe('Geo Utilities', () => {
  it('defines Jember bounds correctly', () => {
    expect(JEMBER_LAT_MIN).toBe(-8.6)
    expect(JEMBER_LAT_MAX).toBe(-7.8)
    expect(JEMBER_LNG_MIN).toBe(113.2)
    expect(JEMBER_LNG_MAX).toBe(114.2)
  })

  it('validates coordinates within Jember region', () => {
    // Center of Jember approx (-8.17, 113.70)
    expect(isWithinJember(-8.17, 113.70)).toBe(true)
    // Outside Jember (e.g. Jakarta)
    expect(isWithinJember(-6.2, 106.8)).toBe(false)
    expect(isWithinJember(NaN, 113.7)).toBe(false)
  })

  it('calculates distance correctly', () => {
    const dist = calculateDistance(-8.17, 113.70, -8.18, 113.71)
    expect(dist).toBeGreaterThan(0)
  })
})
