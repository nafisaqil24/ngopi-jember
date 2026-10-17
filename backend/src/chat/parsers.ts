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

  // Remove 'rp', whitespace, and thousands separators (dots or commas)
  // E.g. "Rp15.000 - Rp50.000" -> "15000 - 50000"
  // E.g. "25000 - 50000"
  const numbersOnly = cleaned.replace(/rp/g, '').replace(/\./g, '').replace(/,/g, '')
  
  // Find all number groups
  const matches = numbersOnly.match(/\d+/g)
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

export type OpenStatus = 'buka' | 'tutup' | 'tidak_diketahui'

export function getOpenStatus(openingHours: string | null | undefined, now: Date = new Date()): OpenStatus {
  if (!openingHours || typeof openingHours !== 'string') return 'tidak_diketahui'
  const trimmed = openingHours.trim().toLowerCase()
  if (trimmed.includes('belum tersedia') || trimmed === '-' || trimmed === '') {
    return 'tidak_diketahui'
  }
  if (trimmed.includes('24 jam') || trimmed === '00:00 - 23:59' || trimmed === '00:00 - 00:00') {
    return 'buka'
  }

  // Parse Jakarta time
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Jakarta',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
    const parts = formatter.formatToParts(now)
    const hourStr = parts.find((p) => p.type === 'hour')?.value || '0'
    const minuteStr = parts.find((p) => p.type === 'minute')?.value || '0'
    const currentMinutes = parseInt(hourStr, 10) * 60 + parseInt(minuteStr, 10)

    // Expected format: "15:00 - 23:00" or "09:00 - 00:00"
    const timeRegex = /(\d{1,2}):(\d{2})\s*[-–to]+\s*(\d{1,2}):(\d{2})/
    const match = trimmed.match(timeRegex)
    if (!match) return 'tidak_diketahui'

    const startH = parseInt(match[1], 10)
    const startM = parseInt(match[2], 10)
    let endH = parseInt(match[3], 10)
    const endM = parseInt(match[4], 10)

    const startMinutes = startH * 60 + startM
    let endMinutes = endH * 60 + endM

    // Handle midnight closing (e.g. 09:00 - 00:00 -> endMinutes = 24 * 60 = 1440)
    if (endMinutes === 0 && startMinutes > 0) {
      endMinutes = 24 * 60
    }
    // If end time is earlier than start time and not 00:00, e.g. 17:00 - 02:00
    if (endMinutes < startMinutes) {
      endMinutes += 24 * 60
      if (currentMinutes < startMinutes) {
        // e.g. currently 01:00, hours 17:00 - 02:00 -> currentMinutes needs to be adjusted or compare range
        const adjustedCurrent = currentMinutes + 24 * 60
        return adjustedCurrent >= startMinutes && adjustedCurrent <= endMinutes ? 'buka' : 'tutup'
      }
    }

    return currentMinutes >= startMinutes && currentMinutes <= endMinutes ? 'buka' : 'tutup'
  } catch {
    return 'tidak_diketahui'
  }
}
