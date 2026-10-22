const VALID_CATEGORIES = new Set([
  'Specialty Coffee',
  'Kopi Tradisional',
  'Kopi Susu Kekinian',
  'Cocok Buat WFH / Belajar',
  'Tempat Nongkrong',
  'Outdoor / Garden',
  'Live Music',
])

const VALID_FACILITIES = new Set([
  'WiFi',
  'Colokan Listrik',
  'AC',
  'Smoking Area',
  'Non-Smoking Area',
  'Parkir Motor',
  'Parkir Mobil',
  'Musala',
  'Toilet',
  'Outdoor Seating',
  'Bisa Reservasi',
  'Buka 24 Jam',
])

const JEMBER_LAT_MIN = -8.6
const JEMBER_LAT_MAX = -7.8
const JEMBER_LNG_MIN = 113.2
const JEMBER_LNG_MAX = 114.2
const MIN_DECIMALS = 5

type ValidationResult<T> =
  | { ok: true; value: T; warning?: string }
  | { ok: false; error: string }

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s/]+/g, '-')
    .replace(/-+/g, '-')
}

function uniqueSlug(base: string, existing: Set<string>): string {
  let slug = slugify(base)
  let counter = 1
  while (existing.has(slug)) {
    slug = `${slug}-${counter}`
    counter++
  }
  return slug
}

function normalizePhone(raw: string): string {
  let value = raw.replace(/[\s\-+]/g, '')
  if (value.startsWith('0')) value = '62' + value.slice(1)
  return value
}

function normalizeInstagram(raw: string): string {
  return raw.replace(/^@+/, '').trim()
}

export const validateAndNormalize = {
  slugify,
  uniqueSlug,
  priceRange(raw: string, lineNum: number): ValidationResult<{ min: number; max: number }> {
    const trimmed = raw.trim()
    if (trimmed === 'Belum tersedia') {
      return { ok: false, error: `Baris ${lineNum}: priceRange tidak boleh "Belum tersedia"` }
    }
    const match = trimmed.match(/^Rp(\d+)\s*-\s*Rp(\d+)$/)
    if (!match) {
      return { ok: false, error: `Baris ${lineNum}: priceRange format harus "Rp<angka> - Rp<angka>" (dapat: "${trimmed}")` }
    }
    const min = parseInt(match[1], 10)
    const max = parseInt(match[2], 10)
    if (min < 1000) {
      return { ok: false, error: `Baris ${lineNum}: harga termurah minimal 1000 (dapat: ${min}), kemungkinan salah baca singkatan harga` }
    }
    if (min > max) {
      return { ok: false, error: `Baris ${lineNum}: priceRange min (${min}) harus <= max (${max})` }
    }
    return { ok: true, value: { min, max } }
  },

  openingHours(raw: string, lineNum: number): ValidationResult<string> {
    const trimmed = raw.trim()
    if (trimmed === 'Belum tersedia') {
      return { ok: false, error: `Baris ${lineNum}: openingHours tidak boleh "Belum tersedia"` }
    }
    const normalized = trimmed.replace(/\s*-\s*/, ' - ')
    const match = normalized.match(/^(\d{2}):(\d{2}) - (\d{2}):(\d{2})$/)
    if (!match) {
      return { ok: false, error: `Baris ${lineNum}: openingHours format harus "HH:MM - HH:MM" (dapat: "${trimmed}")` }
    }
    const h1 = parseInt(match[1], 10)
    const m1 = parseInt(match[2], 10)
    const h2 = parseInt(match[3], 10)
    const m2 = parseInt(match[4], 10)
    if (h1 > 23 || m1 > 59 || h2 > 23 || m2 > 59) {
      return { ok: false, error: `Baris ${lineNum}: jam/menit tidak valid` }
    }
    return { ok: true, value: normalized }
  },

  coordinates(latRaw: string, lngRaw: string, lineNum: number): ValidationResult<{ latitude: number; longitude: number }> {
    const latTrimmed = latRaw.trim()
    const lngTrimmed = lngRaw.trim()
    const latFilled = latTrimmed !== ''
    const lngFilled = lngTrimmed !== ''

    if (latFilled !== lngFilled) {
      return { ok: false, error: `Baris ${lineNum}: latitude dan longitude harus diisi keduanya atau dikosongkan keduanya` }
    }
    if (!latFilled && !lngFilled) {
      return { ok: false, error: `Baris ${lineNum}: koordinat wajib diisi` }
    }

    const lat = parseFloat(latTrimmed)
    const lng = parseFloat(lngTrimmed)
    if (isNaN(lat) || isNaN(lng)) {
      return { ok: false, error: `Baris ${lineNum}: latitude/longitude bukan angka valid` }
    }
    if (lat < JEMBER_LAT_MIN || lat > JEMBER_LAT_MAX || lng < JEMBER_LNG_MIN || lng > JEMBER_LNG_MAX) {
      return { ok: false, error: `Baris ${lineNum}: koordinat di luar wilayah Jember (lat ${JEMBER_LAT_MIN}..${JEMBER_LAT_MAX}, lng ${JEMBER_LNG_MIN}..${JEMBER_LNG_MAX})` }
    }

    const latDecimals = latTrimmed.includes('.') ? latTrimmed.split('.')[1].replace(/[^0-9]/g, '').length : 0
    const lngDecimals = lngTrimmed.includes('.') ? lngTrimmed.split('.')[1].replace(/[^0-9]/g, '').length : 0
    let warning: string | undefined
    if (latDecimals < MIN_DECIMALS || lngDecimals < MIN_DECIMALS) {
      warning = `Baris ${lineNum}: koordinat presisi rendah (lat ${latDecimals} desimal, lng ${lngDecimals} desimal, disarankan >= ${MIN_DECIMALS})`
    }
    return { ok: true, value: { latitude: lat, longitude: lng }, warning }
  },

  phone(raw: string, lineNum: number): ValidationResult<string | undefined> {
    const trimmed = raw.trim()
    if (trimmed === '') return { ok: true, value: undefined }
    const normalized = normalizePhone(trimmed)
    if (!/^\d+$/.test(normalized) || normalized.length < 10) {
      return { ok: false, error: `Baris ${lineNum}: phone tidak berisi digit valid setelah normalisasi` }
    }
    return { ok: true, value: normalized }
  },

  instagram(raw: string, lineNum: number): ValidationResult<string | undefined> {
    const trimmed = raw.trim()
    if (trimmed === '') return { ok: true, value: undefined }
    const normalized = normalizeInstagram(trimmed)
    if (normalized === '') {
      return { ok: false, error: `Baris ${lineNum}: instagram hanya berisi "@"` }
    }
    return { ok: true, value: normalized }
  },

  refs(raw: string, validSet: Set<string>, label: string, lineNum: number): ValidationResult<string[] | undefined> {
    const trimmed = raw.trim()
    if (trimmed === '') return { ok: true, value: undefined }
    const names = trimmed
      .split('|')
      .map((part) => part.trim())
      .filter((part) => part.length > 0)
    if (names.length === 0) {
      return { ok: false, error: `Baris ${lineNum}: kolom ${label} tidak berisi nama valid` }
    }
    const deduped = Array.from(new Set(names))
    for (const name of deduped) {
      if (!validSet.has(name)) {
        return { ok: false, error: `Baris ${lineNum}: ${label} "${name}" tidak ada di daftar valid` }
      }
    }
    return { ok: true, value: deduped }
  },
}

export { VALID_CATEGORIES, VALID_FACILITIES, JEMBER_LAT_MIN, JEMBER_LAT_MAX, JEMBER_LNG_MIN, JEMBER_LNG_MAX, MIN_DECIMALS }