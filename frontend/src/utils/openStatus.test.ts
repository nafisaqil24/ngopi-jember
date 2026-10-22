import { describe, it, expect } from 'vitest'
import { isShopOpen, getEffectiveOpenStatus } from './openStatus'
import { parseOpeningHours } from './openingHours'

// Zona Asia/Jakarta = UTC+7 (tanpa DST). Bantu: jam WIB -> UTC = kurangi 7 jam.
function jakarta(dateUtcIso: string): Date {
  return new Date(dateUtcIso)
}

describe('parseOpeningHours', () => {
  it('mengurai format standar', () => {
    expect(parseOpeningHours('07:00 - 23:00')).toEqual({ openMinutes: 420, closeMinutes: 1380 })
  })

  it('mengurai format titik "08.00 - 22.00"', () => {
    expect(parseOpeningHours('08.00 - 22.00')).toEqual({ openMinutes: 480, closeMinutes: 1320 })
  })

  it('"24 jam" = buka 24 jam penuh', () => {
    expect(parseOpeningHours('24 jam')).toEqual({ openMinutes: 0, closeMinutes: 1440 })
  })

  it('"00:00 - 23:59" = buka 24 jam penuh', () => {
    expect(parseOpeningHours('00:00 - 23:59')).toEqual({ openMinutes: 0, closeMinutes: 1440 })
  })

  it('"09:00 - 00:00" tutup tepat tengah malam (24:00)', () => {
    expect(parseOpeningHours('09:00 - 00:00')).toEqual({ openMinutes: 540, closeMinutes: 1440 })
  })

  it('format tak dikenali / kosong -> null', () => {
    expect(parseOpeningHours('Belum tersedia')).toBeNull()
    expect(parseOpeningHours('')).toBeNull()
    expect(parseOpeningHours(null)).toBeNull()
    expect(parseOpeningHours('kapan saja')).toBeNull()
  })
})

describe('isShopOpen — 07:00 - 23:00 (jam normal)', () => {
  it('22:30 WIB -> buka', () => {
    expect(isShopOpen('07:00', '23:00', jakarta('2026-10-17T15:30:00Z'))).toBe(true)
  })
  it('23:00 WIB (batas tutup eksklusif) -> tutup', () => {
    expect(isShopOpen('07:00', '23:00', jakarta('2026-10-17T16:00:00Z'))).toBe(false)
  })
  it('23:30 WIB -> tutup', () => {
    expect(isShopOpen('07:00', '23:00', jakarta('2026-10-17T16:30:00Z'))).toBe(false)
  })
  it('06:00 WIB -> tutup', () => {
    expect(isShopOpen('07:00', '23:00', jakarta('2026-10-16T23:00:00Z'))).toBe(false)
  })
  it('07:00 WIB (batas buka inklusif) -> buka', () => {
    expect(isShopOpen('07:00', '23:00', jakarta('2026-10-17T00:00:00Z'))).toBe(true)
  })
})

describe('isShopOpen — 09:00 - 03:00 (lewat tengah malam)', () => {
  it('00:30 WIB -> buka', () => {
    expect(isShopOpen('09:00', '03:00', jakarta('2026-10-16T17:30:00Z'))).toBe(true)
  })
  it('01:00 WIB -> buka', () => {
    expect(isShopOpen('09:00', '03:00', jakarta('2026-10-16T18:00:00Z'))).toBe(true)
  })
  it('02:59 WIB -> buka', () => {
    expect(isShopOpen('09:00', '03:00', jakarta('2026-10-16T19:59:00Z'))).toBe(true)
  })
  it('03:00 WIB (batas tutup eksklusif) -> tutup', () => {
    expect(isShopOpen('09:00', '03:00', jakarta('2026-10-16T20:00:00Z'))).toBe(false)
  })
  it('05:00 WIB -> tutup', () => {
    expect(isShopOpen('09:00', '03:00', jakarta('2026-10-16T22:00:00Z'))).toBe(false)
  })
  it('08:59 WIB -> tutup', () => {
    expect(isShopOpen('09:00', '03:00', jakarta('2026-10-17T01:59:00Z'))).toBe(false)
  })
  it('09:00 WIB (batas buka inklusif) -> buka', () => {
    expect(isShopOpen('09:00', '03:00', jakarta('2026-10-17T02:00:00Z'))).toBe(true)
  })
  it('22:00 WIB -> buka', () => {
    expect(isShopOpen('09:00', '03:00', jakarta('2026-10-17T15:00:00Z'))).toBe(true)
  })
})

describe('getEffectiveOpenStatus — fallback & format khusus', () => {
  it('"24 jam" -> buka', () => {
    expect(getEffectiveOpenStatus('24 jam')).toBe('buka')
  })

  it('format tak dikenali tanpa status -> tidak_diketahui', () => {
    expect(getEffectiveOpenStatus('kapan saja')).toBe('tidak_diketahui')
  })

  it('format tak dikenali fallback ke status OPEN -> buka', () => {
    expect(getEffectiveOpenStatus('Belum tersedia', 'OPEN')).toBe('buka')
  })

  it('format tak dikenali fallback ke status CLOSED -> tutup', () => {
    expect(getEffectiveOpenStatus(null, 'CLOSED')).toBe('tutup')
  })

  it('jam valid menang atas status statis (status OPEN tapi jam sudah tutup) -> tutup', () => {
    // Status statis OPEN, tapi jam 07:00 - 23:00 dan sekarang 23:30 WIB -> tutup.
    expect(getEffectiveOpenStatus('07:00 - 23:00', 'OPEN', jakarta('2026-10-17T16:30:00Z'))).toBe('tutup')
  })
})