export interface PriceRangeParsed {
  min: number | null
  max: number | null
}

export function parsePriceRange(text: string | null | undefined): PriceRangeParsed | null {
  if (!text || typeof text !== 'string') return null
  const cleaned = text.trim().toLowerCase()
  if (cleaned.includes('belum tersedia') || cleaned === '-' || cleaned === '') {
    return null
  }

  // Remove 'rp', whitespace, convert rb/k/ribu to thousands, and remove thousands separators (dots or commas)
  let processed = cleaned
    .replace(/rp/g, '')
    .replace(/(\d+)\s*(k|rb|ribu)\b/g, (_, num) => String(parseInt(num, 10) * 1000))
    .replace(/\./g, '')
    .replace(/,/g, '')
  
  // Find all number groups
  const matches = processed.match(/\d+/g)
  if (!matches || matches.length === 0) return null

  if (matches.length === 1) {
    const val = parseInt(matches[0], 10)
    return { min: val, max: val }
  }

  const min = parseInt(matches[0], 10)
  const max = parseInt(matches[1], 10)
  return {
    min: isNaN(min) ? null : min,
    max: isNaN(max) ? null : max,
  }
}

export { getOpenStatus } from '../utils/openingHours.js'
export type {
  OpenStatus,
  OpeningHourEntry,
  OpenStatusInput,
  JakartaTime,
} from '../utils/openingHours.js'
