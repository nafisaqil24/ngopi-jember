// Parser jam operasional kedai.
// Format yang didukung (dari data seed/DB): "HH:MM - HH:MM" (mis. "07:00 - 23:00",
// "09:00 - 03:00", "00:00 - 23:59"), pemisah "-", en/em dash, atau "to", serta
// teks "24 jam". Mengembalikan null bila format tidak dikenali.

export interface ParsedOpeningHours {
  openMinutes: number
  closeMinutes: number
}

const FULL_DAY_MINUTES = 24 * 60

function toMinutes(hours: number, minutes: number): number {
  return hours * 60 + minutes
}

export function parseOpeningHours(openingHours: string | null | undefined): ParsedOpeningHours | null {
  if (!openingHours || typeof openingHours !== 'string') return null

  const trimmed = openingHours.trim()
  if (trimmed === '' || /belum tersedia/i.test(trimmed)) return null

  if (/24\s*jam/i.test(trimmed)) {
    return { openMinutes: 0, closeMinutes: FULL_DAY_MINUTES }
  }

  // Normalisasi "07.00" -> "07:00" agar format titik juga terbaca.
  const normalized = trimmed.replace(/\./g, ':')
  const match = normalized.match(/(\d{1,2}):(\d{2})\s*(?:-|–|—|to)\s*(\d{1,2}):(\d{2})/i)
  if (!match) return null

  const openH = parseInt(match[1], 10)
  const openM = parseInt(match[2], 10)
  const closeH = parseInt(match[3], 10)
  const closeM = parseInt(match[4], 10)
  if ([openH, openM, closeH, closeM].some((n) => Number.isNaN(n))) return null
  if (openH > 24 || closeH > 24 || openM > 59 || closeM > 59) return null

  let openMinutes = toMinutes(openH, openM)
  let closeMinutes = toMinutes(closeH, closeM)

  // "00:00 - 23:59" diperlakukan sebagai buka 24 jam penuh.
  if (openMinutes === 0 && closeMinutes >= FULL_DAY_MINUTES - 1) {
    return { openMinutes: 0, closeMinutes: FULL_DAY_MINUTES }
  }

  // "09:00 - 00:00": tutup tepat tengah malam -> 24:00.
  if (closeMinutes === 0 && openMinutes > 0) {
    closeMinutes = FULL_DAY_MINUTES
  }

  return { openMinutes, closeMinutes }
}