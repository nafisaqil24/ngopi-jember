import { describe, it, expect } from 'vitest'
import { parsePriceRange, getOpenStatus } from './parsers.js'

describe('Parsers: parsePriceRange', () => {
  it('parses formatted price range with dots and Rp', () => {
    expect(parsePriceRange('Rp15.000 - Rp50.000')).toEqual({ min: 15000, max: 50000 })
    expect(parsePriceRange('Rp25000 - Rp50000')).toEqual({ min: 25000, max: 50000 })
  })

  it('parses price range with rb, k, ribu and extra spaces', () => {
    expect(parsePriceRange('25rb - 50rb')).toEqual({ min: 25000, max: 50000 })
    expect(parsePriceRange('25 k - 50 k')).toEqual({ min: 25000, max: 50000 })
    expect(parsePriceRange('25 ribu - 50 ribu')).toEqual({ min: 25000, max: 50000 })
    expect(parsePriceRange('Rp 25k - 50k')).toEqual({ min: 25000, max: 50000 })
  })

  it('handles "Belum tersedia" or invalid ranges', () => {
    expect(parsePriceRange('Belum tersedia')).toBeNull()
    expect(parsePriceRange('')).toBeNull()
    expect(parsePriceRange(null)).toBeNull()
  })
})

describe('Parsers: getOpenStatus', () => {
  it('returns tidak_diketahui for missing or unavailable opening hours', () => {
    expect(getOpenStatus('Belum tersedia')).toBe('tidak_diketahui')
    expect(getOpenStatus(null)).toBe('tidak_diketahui')
  })

  it('correctly checks open status with Jakarta timezone', () => {
    // 00:00 - 23:59 -> always buka
    expect(getOpenStatus('00:00 - 23:59', new Date('2026-10-17T12:00:00Z'))).toBe('buka')

    // 15:00 - 23:00 Jakarta (UTC+7 -> 15:00 WIB is 08:00 UTC)
    // Testing at 15:30 WIB (08:30 UTC) -> buka
    const dateOpen = new Date('2026-10-17T08:30:00Z')
    expect(getOpenStatus('15:00 - 23:00', dateOpen)).toBe('buka')

    // Testing at 14:00 WIB (07:00 UTC) -> tutup
    const dateClosed = new Date('2026-10-17T07:00:00Z')
    expect(getOpenStatus('15:00 - 23:00', dateClosed)).toBe('tutup')
  })

  it('handles midnight closing (09:00 - 00:00)', () => {
    // 23:30 WIB (16:30 UTC) -> buka
    const dateLate = new Date('2026-10-17T16:30:00Z')
    expect(getOpenStatus('09:00 - 00:00', dateLate)).toBe('buka')

    // 01:30 WIB next day (18:30 UTC previous day) -> tutup
    const dateMidnightPassed = new Date('2026-10-16T18:30:00Z')
    expect(getOpenStatus('09:00 - 00:00', dateMidnightPassed)).toBe('tutup')
  })
})
