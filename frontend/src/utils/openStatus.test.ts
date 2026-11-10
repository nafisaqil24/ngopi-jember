import { describe, it, expect } from 'vitest'
import {
  isShopOpen,
  getEffectiveOpenStatus,
  getTodayDayOfWeekJakarta,
} from './openStatus'
import {
  parseOpeningHours,
  formatDayName,
  defaultWeeklyOpeningHours,
  entriesFromLegacyOpeningHours,
  isOvernightRange,
  validateOpeningHoursEntries,
} from './openingHours'

// Zona Asia/Jakarta = UTC+7 (tanpa DST). Bantu: jam WIB -> UTC = kurangi 7 jam.
function jakarta(dateUtcIso: string): Date {
  return new Date(dateUtcIso)
}

// Senin-Rabu 07:00-23:00, Kamis-Jumat 07:00-00:00, Sabtu-Minggu 09:00-03:30.
const weeklyHours = [
  { dayOfWeek: 0, open: '09:00', close: '03:30', isClosed: false },
  { dayOfWeek: 1, open: '07:00', close: '23:00', isClosed: false },
  { dayOfWeek: 2, open: '07:00', close: '23:00', isClosed: false },
  { dayOfWeek: 3, open: '07:00', close: '23:00', isClosed: false },
  { dayOfWeek: 4, open: '07:00', close: '00:00', isClosed: false },
  { dayOfWeek: 5, open: '07:00', close: '00:00', isClosed: false },
  { dayOfWeek: 6, open: '09:00', close: '03:30', isClosed: false },
]

const withHours = (now: string) =>
  getEffectiveOpenStatus({ openingHourEntries: weeklyHours }, new Date(now))

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

describe('getEffectiveOpenStatus — jadwal per hari', () => {
  it('Senin 06:59 tutup, 07:00 buka, 22:59 buka, 23:00 tutup', () => {
    expect(withHours('2026-10-18T23:59:00Z')).toBe('tutup') // Senin 06:59 WIB
    expect(withHours('2026-10-19T00:00:00Z')).toBe('buka') // Senin 07:00 WIB
    expect(withHours('2026-10-19T15:59:00Z')).toBe('buka') // Senin 22:59 WIB
    expect(withHours('2026-10-19T16:00:00Z')).toBe('tutup') // Senin 23:00 WIB
  })

  it('Kamis 23:59 buka; Jumat 00:00 tutup', () => {
    expect(withHours('2026-10-22T16:59:00Z')).toBe('buka') // Kamis 23:59 WIB
    expect(withHours('2026-10-22T17:00:00Z')).toBe('tutup') // Jumat 00:00 WIB
  })

  it('Sabtu-Minggu 09:00-03:30 termasuk numpang jadwal kemarin', () => {
    expect(withHours('2026-10-24T16:00:00Z')).toBe('buka') // Sabtu 23:00 WIB
    expect(withHours('2026-10-24T18:00:00Z')).toBe('buka') // Minggu 01:00 WIB
    expect(withHours('2026-10-24T20:30:00Z')).toBe('tutup') // Minggu 03:30 WIB
  })

  it('Senin 01:00 buka (numpang jadwal Minggu)', () => {
    expect(withHours('2026-10-25T18:00:00Z')).toBe('buka')
  })

  it('konversi UTC -> WIB (Sabtu 17:00 UTC = Minggu 00:00 WIB)', () => {
    expect(withHours('2026-10-17T17:00:00Z')).toBe('buka')
    // Sabtu 21:00 UTC = Minggu 04:00 WIB -> sudah tutup
    expect(withHours('2026-10-17T21:00:00Z')).toBe('tutup')
  })

  it('isClosed menutup walau jam valid', () => {
    const entries = weeklyHours.map((entry) =>
      entry.dayOfWeek === 1 ? { ...entry, isClosed: true } : entry
    )
    expect(
      getEffectiveOpenStatus({ openingHourEntries: entries }, new Date('2026-10-19T03:00:00Z'))
    ).toBe('tutup')
  })

  it('status CLOSED/TEMPORARILY_CLOSED menimpa jadwal', () => {
    expect(
      getEffectiveOpenStatus(
        { status: 'CLOSED', openingHourEntries: weeklyHours },
        new Date('2026-10-19T03:00:00Z')
      )
    ).toBe('tutup')
    expect(
      getEffectiveOpenStatus(
        { status: 'TEMPORARILY_CLOSED', openingHourEntries: weeklyHours },
        new Date('2026-10-19T03:00:00Z')
      )
    ).toBe('tutup')
  })
})

describe('getEffectiveOpenStatus — fallback string lama', () => {
  it('tanpa entries + string valid -> fallback jalan', () => {
    expect(
      getEffectiveOpenStatus({ openingHours: '07:00 - 23:00' }, new Date('2026-10-19T03:00:00Z'))
    ).toBe('buka')
    expect(
      getEffectiveOpenStatus({ openingHours: '09:00 - 03:00' }, new Date('2026-10-16T18:00:00Z'))
    ).toBe('buka')
  })

  it('tanpa entries + format gagal -> tidak_diketahui', () => {
    expect(getEffectiveOpenStatus({ openingHours: 'Belum tersedia' })).toBe('tidak_diketahui')
    expect(getEffectiveOpenStatus({ openingHours: 'kapan saja', status: 'OPEN' })).toBe('tidak_diketahui')
    expect(getEffectiveOpenStatus({ openingHours: null })).toBe('tidak_diketahui')
  })

  it('status CLOSED menimpa walau string valid', () => {
    expect(
      getEffectiveOpenStatus(
        { openingHours: '07:00 - 23:00', status: 'CLOSED' },
        new Date('2026-10-19T03:00:00Z')
      )
    ).toBe('tutup')
  })

  it('batas tutup eksklusif', () => {
    expect(
      getEffectiveOpenStatus({ openingHours: '15:00 - 23:00' }, new Date('2026-10-19T16:00:00Z'))
    ).toBe('tutup')
  })
})

describe('helper hari & editor', () => {
  it('formatDayName', () => {
    expect(formatDayName(1)).toBe('Senin')
    expect(formatDayName(0)).toBe('Minggu')
    expect(formatDayName(6)).toBe('Sabtu')
  })

  it('getTodayDayOfWeekJakarta memakai hari WIB', () => {
    // 2026-10-19T00:00Z = Senin 07:00 WIB
    expect(getTodayDayOfWeekJakarta(new Date('2026-10-19T00:00:00Z'))).toBe(1)
    // 2026-10-17T17:00Z = Minggu 00:00 WIB
    expect(getTodayDayOfWeekJakarta(new Date('2026-10-17T17:00:00Z'))).toBe(0)
  })

  it('defaultWeeklyOpeningHours: 7 hari 10:00-22:00, urut Senin..Minggu', () => {
    const entries = defaultWeeklyOpeningHours()
    expect(entries).toHaveLength(7)
    expect(entries.map((entry) => entry.dayOfWeek)).toEqual([1, 2, 3, 4, 5, 6, 0])
    for (const entry of entries) {
      expect(entry).toMatchObject({ open: '10:00', close: '22:00', isClosed: false })
    }
  })

  it('entriesFromLegacyOpeningHours: string valid -> 7 hari sama', () => {
    const entries = entriesFromLegacyOpeningHours('09:00 - 03:00')
    expect(entries).toHaveLength(7)
    for (const entry of entries) {
      expect(entry).toMatchObject({ open: '09:00', close: '03:00', isClosed: false })
    }
  })

  it('entriesFromLegacyOpeningHours: gagal parse -> default', () => {
    expect(entriesFromLegacyOpeningHours('Belum tersedia')[0]).toMatchObject({
      open: '10:00',
      close: '22:00',
    })
  })

  it('isOvernightRange', () => {
    expect(isOvernightRange('09:00', '03:30')).toBe(true)
    expect(isOvernightRange('07:00', '00:00')).toBe(true)
    expect(isOvernightRange('07:00', '23:00')).toBe(false)
  })

  it('validateOpeningHoursEntries', () => {
    expect(validateOpeningHoursEntries(defaultWeeklyOpeningHours())).toBeNull()
    const missingOpen = defaultWeeklyOpeningHours().map((entry, index) =>
      index === 1 ? { ...entry, open: '' } : entry
    )
    expect(validateOpeningHoursEntries(missingOpen)).not.toBeNull()
    const duplicate = defaultWeeklyOpeningHours().map((entry, index) =>
      index === 1 ? { ...entry, dayOfWeek: 1 } : entry
    )
    expect(validateOpeningHoursEntries(duplicate)).not.toBeNull()
    expect(validateOpeningHoursEntries(defaultWeeklyOpeningHours().slice(0, 6))).not.toBeNull()
  })
})