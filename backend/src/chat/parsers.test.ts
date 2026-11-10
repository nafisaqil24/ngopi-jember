import { describe, it, expect } from 'vitest'
import { parsePriceRange, getOpenStatus } from './parsers.js'
import { parseHHMM, normalizeRange, parseLegacyOpeningHours, minutesToHHMM, entryFromInput, buildOpeningHoursSummary, entriesToResponse } from '../utils/openingHours.js'

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

// Data jadwal uji:
//   Senin-Rabu (1-3) 07:00-23:00, Kamis-Jumat (4-5) 07:00-00:00,
//   Sabtu-Minggu (6,0) 09:00-03:30 (lewat tengah malam).
// Menerima objek mentah agar tidak bergantung pada helper builder.
const weeklyHours = [
  { dayOfWeek: 0, openMinutes: 540, closeMinutes: 1650, isClosed: false }, // Minggu
  { dayOfWeek: 1, openMinutes: 420, closeMinutes: 1380, isClosed: false }, // Senin
  { dayOfWeek: 2, openMinutes: 420, closeMinutes: 1380, isClosed: false }, // Selasa
  { dayOfWeek: 3, openMinutes: 420, closeMinutes: 1380, isClosed: false }, // Rabu
  { dayOfWeek: 4, openMinutes: 420, closeMinutes: 1440, isClosed: false }, // Kamis
  { dayOfWeek: 5, openMinutes: 420, closeMinutes: 1440, isClosed: false }, // Jumat
  { dayOfWeek: 6, openMinutes: 540, closeMinutes: 1650, isClosed: false }, // Sabtu
]

const withHours = (now: string) =>
  getOpenStatus({ openingHourEntries: weeklyHours }, new Date(now))

describe('Parsers: getOpenStatus (entries per hari)', () => {
  it('Senin 06:59 tutup, 07:00 buka, 22:59 buka, 23:00 tutup', () => {
    // 2026-10-19 = Senin (WIB)
    expect(withHours('2026-10-18T23:59:00Z')).toBe('tutup') // Senin 06:59 WIB
    expect(withHours('2026-10-19T00:00:00Z')).toBe('buka') // Senin 07:00 WIB
    expect(withHours('2026-10-19T15:59:00Z')).toBe('buka') // Senin 22:59 WIB
    expect(withHours('2026-10-19T16:00:00Z')).toBe('tutup') // Senin 23:00 WIB
  })

  it('Kamis 23:59 buka; Jumat 00:00 tutup (tutup 00:00)', () => {
    expect(withHours('2026-10-22T16:59:00Z')).toBe('buka') // Kamis 23:59 WIB
    expect(withHours('2026-10-22T17:00:00Z')).toBe('tutup') // Jumat 00:00 WIB
  })

  it('Sabtu-Minggu 09:00-03:30 termasuk numpang jadwal kemarin', () => {
    expect(withHours('2026-10-24T16:00:00Z')).toBe('buka') // Sabtu 23:00 WIB
    expect(withHours('2026-10-24T18:00:00Z')).toBe('buka') // Minggu 01:00 WIB (numpang Sabtu)
    expect(withHours('2026-10-24T20:29:00Z')).toBe('buka') // Minggu 03:29 WIB
    expect(withHours('2026-10-24T20:30:00Z')).toBe('tutup') // Minggu 03:30 WIB
    expect(withHours('2026-10-24T22:00:00Z')).toBe('tutup') // Minggu 05:00 WIB
    expect(withHours('2026-10-25T02:00:00Z')).toBe('buka') // Minggu 09:00 WIB
  })

  it('Senin dini hari numpang jadwal Minggu', () => {
    expect(withHours('2026-10-25T18:00:00Z')).toBe('buka') // Senin 01:00 WIB
    expect(withHours('2026-10-25T20:30:00Z')).toBe('tutup') // Senin 03:30 WIB
  })

  it('konversi timezone: pakai hari WIB, bukan hari UTC', () => {
    // Sabtu 17:00 UTC = Minggu 00:00 WIB
    expect(withHours('2026-10-17T17:00:00Z')).toBe('buka')
    // Sabtu 21:00 UTC = Minggu 04:00 WIB (jika salah pakai UTC akan 'buka')
    expect(withHours('2026-10-17T21:00:00Z')).toBe('tutup')
  })

  it('isClosed=true menutup walau jamnya valid', () => {
    const entries = weeklyHours.map((e) =>
      e.dayOfWeek === 1 ? { ...e, isClosed: true } : e
    )
    expect(getOpenStatus({ openingHourEntries: entries }, new Date('2026-10-19T03:00:00Z'))).toBe('tutup')
  })
})

describe('Parsers: getOpenStatus (status statis menimpa jadwal)', () => {
  it('status CLOSED menutup walau jam valid', () => {
    expect(
      getOpenStatus(
        { status: 'CLOSED', openingHourEntries: weeklyHours },
        new Date('2026-10-19T03:00:00Z')
      )
    ).toBe('tutup')
  })

  it('status TEMPORARILY_CLOSED menutup walau jam valid', () => {
    expect(
      getOpenStatus(
        { status: 'TEMPORARILY_CLOSED', openingHourEntries: weeklyHours },
        new Date('2026-10-19T03:00:00Z')
      )
    ).toBe('tutup')
  })

  it('status OPEN mengikuti jadwal', () => {
    expect(
      getOpenStatus(
        { status: 'OPEN', openingHourEntries: weeklyHours },
        new Date('2026-10-19T03:00:00Z')
      )
    ).toBe('buka')
  })
})

describe('Parsers: getOpenStatus (fallback string lama)', () => {
  it('tanpa entries + string lama valid -> fallback jalan', () => {
    // Senin 10:00 WIB
    expect(getOpenStatus({ openingHours: '07:00 - 23:00' }, new Date('2026-10-19T03:00:00Z'))).toBe('buka')
    // Senin 06:00 WIB
    expect(getOpenStatus({ openingHours: '07:00 - 23:00' }, new Date('2026-10-18T23:00:00Z'))).toBe('tutup')
  })

  it('tanpa entries + "Belum tersedia" -> tidak_diketahui', () => {
    expect(getOpenStatus({ openingHours: 'Belum tersedia' })).toBe('tidak_diketahui')
    expect(getOpenStatus({ openingHours: null })).toBe('tidak_diketahui')
    expect(getOpenStatus({})).toBe('tidak_diketahui')
  })

  it('fallback format 17:00-02:00 (cross-midnight) berjalan', () => {
    // Senin 01:00 WIB -> numpang rentang Minggu malam
    expect(getOpenStatus({ openingHours: '17:00 - 02:00' }, new Date('2026-10-25T18:00:00Z'))).toBe('buka')
    // Senin 03:00 WIB -> sudah tutup
    expect(getOpenStatus({ openingHours: '17:00 - 02:00' }, new Date('2026-10-25T20:00:00Z'))).toBe('tutup')
  })

  it('batas tutup eksklusif pada fallback', () => {
    // Senin 23:00 WIB = tepat jam tutup -> tutup
    expect(getOpenStatus({ openingHours: '15:00 - 23:00' }, new Date('2026-10-19T16:00:00Z'))).toBe('tutup')
  })
})

describe('openingHours: parseHHMM', () => {
  it('memparse format titik dua "09:00" -> 540', () => {
    expect(parseHHMM('09:00')).toBe(540)
  })

  it('memparse format titik "09.00" -> 540', () => {
    expect(parseHHMM('09.00')).toBe(540)
  })

  it('menolak format tidak valid', () => {
    expect(parseHHMM('')).toBeNull()
    expect(parseHHMM(null)).toBeNull()
    expect(parseHHMM('09')).toBeNull()
    expect(parseHHMM('09:60')).toBeNull()
    expect(parseHHMM('24:00')).toBeNull()
    expect(parseHHMM('09:00:00')).toBeNull()
  })
})

describe('openingHours: normalizeRange', () => {
  it('jam tutup setelah buka tetap', () => {
    expect(normalizeRange(420, 1380)).toEqual({ openMinutes: 420, closeMinutes: 1380 })
  })

  it('tutup 00:00 dinormalisasi menjadi 1440', () => {
    expect(normalizeRange(420, 0)).toEqual({ openMinutes: 420, closeMinutes: 1440 })
  })

  it('tutup lebih kecil dari buka ditambah 1440', () => {
    expect(normalizeRange(540, 210)).toEqual({ openMinutes: 540, closeMinutes: 1650 })
  })
})

describe('openingHours: parseLegacyOpeningHours', () => {
  it('memparse "07:00 - 23:00"', () => {
    expect(parseLegacyOpeningHours('07:00 - 23:00')).toEqual({
      openMinutes: 420,
      closeMinutes: 1380,
    })
  })

  it('memparse "07:00 - 00:00" sebagai tutup 1440', () => {
    expect(parseLegacyOpeningHours('07:00 - 00:00')).toEqual({
      openMinutes: 420,
      closeMinutes: 1440,
    })
  })

  it('memparse "09:00 - 03:30" sebagai tutup 1650', () => {
    expect(parseLegacyOpeningHours('09:00 - 03:30')).toEqual({
      openMinutes: 540,
      closeMinutes: 1650,
    })
  })

  it('memparse format titik "08.00 - 22.00"', () => {
    expect(parseLegacyOpeningHours('08.00 - 22.00')).toEqual({
      openMinutes: 480,
      closeMinutes: 1320,
    })
  })

  it('mengambil rentang pertama bila string punya prefix hari', () => {
    expect(parseLegacyOpeningHours('Sabtu 09:00 - 03:30')).toEqual({
      openMinutes: 540,
      closeMinutes: 1650,
    })
  })

  it('mengembalikan null untuk string tidak valid', () => {
    expect(parseLegacyOpeningHours('Belum tersedia')).toBeNull()
    expect(parseLegacyOpeningHours('')).toBeNull()
    expect(parseLegacyOpeningHours(null)).toBeNull()
    expect(parseLegacyOpeningHours('09:00-03')).toBeNull()
  })
})

describe('openingHours: minutesToHHMM', () => {
  it('mengubah menit ke HH:MM', () => {
    expect(minutesToHHMM(540)).toBe('09:00')
    expect(minutesToHHMM(1380)).toBe('23:00')
  })

  it('menormalkan nilai >= 1440 ke jam berikutnya', () => {
    expect(minutesToHHMM(1440)).toBe('00:00')
    expect(minutesToHHMM(1650)).toBe('03:30')
  })
})

describe('openingHours: entryFromInput', () => {
  it('07:00-23:00 -> 420-1380, tidak tutup', () => {
    expect(entryFromInput({ dayOfWeek: 1, open: '07:00', close: '23:00' })).toEqual({
      dayOfWeek: 1,
      openMinutes: 420,
      closeMinutes: 1380,
      isClosed: false,
    })
  })

  it('07:00-00:00 -> tutup 1440', () => {
    expect(entryFromInput({ dayOfWeek: 4, open: '07:00', close: '00:00' })).toEqual({
      dayOfWeek: 4,
      openMinutes: 420,
      closeMinutes: 1440,
      isClosed: false,
    })
  })

  it('09:00-03:30 -> tutup 1650', () => {
    expect(entryFromInput({ dayOfWeek: 6, open: '09:00', close: '03:30' })).toEqual({
      dayOfWeek: 6,
      openMinutes: 540,
      closeMinutes: 1650,
      isClosed: false,
    })
  })

  it('isClosed=true -> 0-0 walau open/close kosong', () => {
    expect(entryFromInput({ dayOfWeek: 2, isClosed: true })).toEqual({
      dayOfWeek: 2,
      openMinutes: 0,
      closeMinutes: 0,
      isClosed: true,
    })
  })
})

describe('openingHours: buildOpeningHoursSummary', () => {
  it('mengelompokkan hari berurutan dengan jam sama', () => {
    expect(buildOpeningHoursSummary(weeklyHours)).toBe(
      'Sen-Rab 07:00-23:00, Kam-Jum 07:00-00:00, Sab-Min 09:00-03:30'
    )
  })

  it('semua hari sama -> satu kelompok Sen-Min', () => {
    const same = [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({
      dayOfWeek,
      openMinutes: 420,
      closeMinutes: 1380,
      isClosed: false,
    }))
    expect(buildOpeningHoursSummary(same)).toBe('Sen-Min 07:00-23:00')
  })

  it('menulis hari tutup secara eksplisit', () => {
    const entries = [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) =>
      dayOfWeek === 2
        ? { dayOfWeek, openMinutes: 0, closeMinutes: 0, isClosed: true }
        : { dayOfWeek, openMinutes: 420, closeMinutes: 1380, isClosed: false }
    )
    expect(buildOpeningHoursSummary(entries)).toBe(
      'Sen 07:00-23:00, Sel tutup, Rab-Min 07:00-23:00'
    )
  })
})

describe('openingHours: entriesToResponse', () => {
  it('urut Senin..Minggu dan memformat jam', () => {
    const result = entriesToResponse(weeklyHours)
    expect(result).toHaveLength(7)
    expect(result.map((entry) => entry.dayOfWeek)).toEqual([1, 2, 3, 4, 5, 6, 0])
    expect(result[0]).toEqual({ dayOfWeek: 1, open: '07:00', close: '23:00', isClosed: false })
    expect(result[3]).toEqual({ dayOfWeek: 4, open: '07:00', close: '00:00', isClosed: false })
    expect(result[5]).toEqual({ dayOfWeek: 6, open: '09:00', close: '03:30', isClosed: false })
  })
})
