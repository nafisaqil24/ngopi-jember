import { describe, it, expect } from 'vitest'
import { validateAndNormalize, VALID_CATEGORIES, VALID_FACILITIES, buildOpeningHourRows } from './seed-kedai-validation.js'

describe('seed-kedai-validation: validateAndNormalize', () => {
  // --- priceRange ---
  it('validasi priceRange benar: "Rp5000 - Rp25000"', () => {
    const res = validateAndNormalize.priceRange('Rp5000 - Rp25000', 1)
    expect(res.ok).toBe(true)
    expect(res.value).toEqual({ min: 5000, max: 25000 })
  })

  it('validasi priceRange tolak "Belum tersedia"', () => {
    const res = validateAndNormalize.priceRange('Belum tersedia', 1)
    expect(res.ok).toBe(false)
    expect(res.error).toContain('Belum tersedia')
  })

  it('validasi priceRange tolak min < 1000 (kasus Rp1 / Rp500)', () => {
    const res = validateAndNormalize.priceRange('Rp500 - Rp10000', 1)
    expect(res.ok).toBe(false)
    expect(res.error).toContain('termurah minimal 1000')
  })

  it('validasi priceRange tolak min > max', () => {
    const res = validateAndNormalize.priceRange('Rp30000 - Rp20000', 1)
    expect(res.ok).toBe(false)
    expect(res.error).toContain('harus <=')
  })

  it('validasi priceRange tolak format tidak valid', () => {
    const res = validateAndNormalize.priceRange('5000 - 25000', 1)
    expect(res.ok).toBe(false)
    expect(res.error).toContain('format')
  })

  // --- openingHours ---
  it('validasi openingHours benar: "09:00 - 03:00"', () => {
    const res = validateAndNormalize.openingHours('09:00 - 03:00', 1)
    expect(res.ok).toBe(true)
    expect(res.value).toBe('09:00 - 03:00')
  })

  it('normalisasi openingHours "08:00-22:00" -> "08:00 - 22:00"', () => {
    const res = validateAndNormalize.openingHours('08:00-22:00', 1)
    expect(res.ok).toBe(true)
    expect(res.value).toBe('08:00 - 22:00')
  })

  it('validasi openingHours tolak "Belum tersedia"', () => {
    const res = validateAndNormalize.openingHours('Belum tersedia', 1)
    expect(res.ok).toBe(false)
    expect(res.error).toContain('Belum tersedia')
  })

  it('validasi openingHours tolak format tidak valid', () => {
    const res = validateAndNormalize.openingHours('09:00-03', 1)
    expect(res.ok).toBe(false)
    expect(res.error).toContain('format')
  })

  // --- koordinat ---
  it('validasi koordinat dalam Jember benar', () => {
    const res = validateAndNormalize.coordinates('-8.1702138', '113.7271038', 1)
    expect(res.ok).toBe(true)
    expect(res.value).toEqual({ latitude: -8.1702138, longitude: 113.7271038 })
  })

  it('validasi koordinat tolak di luar Jember', () => {
    const res = validateAndNormalize.coordinates('-6.2', '106.8', 1)
    expect(res.ok).toBe(false)
    expect(res.error).toContain('Jember')
  })

  it('validasi koordinat tolak tidak pasangan', () => {
    const res = validateAndNormalize.coordinates('-8.17', '', 1)
    expect(res.ok).toBe(false)
    expect(res.error).toContain('keduanya')
  })

  it('validasi koordinat warning desimal < 5', () => {
    const res = validateAndNormalize.coordinates('-8.17', '113.72', 1)
    expect(res.ok).toBe(true)
    expect(res.warning).toContain('presisi rendah')
  })

  // --- phone ---
  it('normalisasi phone "085748951108" -> "6285748951108"', () => {
    const res = validateAndNormalize.phone('085748951108', 1)
    expect(res.ok).toBe(true)
    expect(res.value).toBe('6285748951108')
  })

  it('normalisasi phone "6285748951108" tetap sama', () => {
    const res = validateAndNormalize.phone('6285748951108', 1)
    expect(res.ok).toBe(true)
    expect(res.value).toBe('6285748951108')
  })

  it('phone opsional kosong -> ok', () => {
    const res = validateAndNormalize.phone('', 1)
    expect(res.ok).toBe(true)
    expect(res.value).toBeUndefined()
  })

  // --- instagram ---
  it('normalisasi instagram "@marginescape" -> "marginescape"', () => {
    const res = validateAndNormalize.instagram('@marginescape', 1)
    expect(res.ok).toBe(true)
    expect(res.value).toBe('marginescape')
  })

  it('instagram opsional kosong -> ok', () => {
    const res = validateAndNormalize.instagram('', 1)
    expect(res.ok).toBe(true)
    expect(res.value).toBeUndefined()
  })

  // --- kategori/fasilitas ---
  it('validasi kategori benar (nama persis, dipisah |)', () => {
    const res = validateAndNormalize.refs('Cocok Buat WFH / Belajar|Tempat Nongkrong|Specialty Coffee', VALID_CATEGORIES, 'kategori', 1)
    expect(res.ok).toBe(true)
    expect(res.value).toEqual(['Cocok Buat WFH / Belajar', 'Tempat Nongkrong', 'Specialty Coffee'])
  })

  it('validasi fasilitas benar', () => {
    const res = validateAndNormalize.refs('WiFi|Parkir Motor|Toilet', VALID_FACILITIES, 'fasilitas', 1)
    expect(res.ok).toBe(true)
    expect(res.value).toEqual(['WiFi', 'Parkir Motor', 'Toilet'])
  })

  it('validasi tolak nama tidak valid', () => {
    const res = validateAndNormalize.refs('WiFi|Tidak Ada', VALID_FACILITIES, 'fasilitas', 1)
    expect(res.ok).toBe(false)
    expect(res.error).toContain('tidak ada di daftar')
  })

  it('kosong -> undefined (tidak disentuh)', () => {
    const res = validateAndNormalize.refs('', VALID_CATEGORIES, 'kategori', 1)
    expect(res.ok).toBe(true)
    expect(res.value).toBeUndefined()
  })

  // --- slug ---
  it('slugify "Margin Cafe" -> "margin-cafe"', () => {
    expect(validateAndNormalize.slugify('Margin Cafe')).toBe('margin-cafe')
  })

  it('slugify menangani karakter khusus', () => {
    expect(validateAndNormalize.slugify('Kopi & Teh')).toBe('kopi-teh')
  })

  it('uniqueSlug base sudah ada -> base-1', () => {
    const existing = new Set(['margin-cafe'])
    expect(validateAndNormalize.uniqueSlug('Margin Cafe', existing)).toBe('margin-cafe-1')
  })
})

describe('seed-kedai-validation: buildOpeningHourRows', () => {
  it('membuat 7 baris untuk semua hari dengan jam sama', () => {
    const rows = buildOpeningHourRows('09:00 - 03:30')
    expect(rows).toHaveLength(7)
    expect(rows?.map((row) => row.dayOfWeek)).toEqual([0, 1, 2, 3, 4, 5, 6])
    for (const row of rows!) {
      expect(row.openMinutes).toBe(540)
      expect(row.closeMinutes).toBe(1650)
      expect(row.isClosed).toBe(false)
    }
  })

  it('mengembalikan null bila openingHours tidak valid', () => {
    expect(buildOpeningHourRows('Belum tersedia')).toBeNull()
    expect(buildOpeningHourRows(null)).toBeNull()
  })
})