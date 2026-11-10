// Parser jam operasional kedai.
// Format yang didukung (dari data seed/DB): "HH:MM - HH:MM" (mis. "07:00 - 23:00",
// "09:00 - 03:00", "00:00 - 23:59"), pemisah "-", en/em dash, atau "to", serta
// teks "24 jam". Mengembalikan null bila format tidak dikenali.

import type { OpeningHourEntry } from '../types/coffeeShop'

export interface ParsedOpeningHours {
  openMinutes: number
  closeMinutes: number
}

const FULL_DAY_MINUTES = 24 * 60

export const DAY_DISPLAY_ORDER = [1, 2, 3, 4, 5, 6, 0]

const DAY_NAMES: Record<number, string> = {
  0: 'Minggu',
  1: 'Senin',
  2: 'Selasa',
  3: 'Rabu',
  4: 'Kamis',
  5: 'Jumat',
  6: 'Sabtu',
}

export function formatDayName(dayOfWeek: number): string {
  return DAY_NAMES[dayOfWeek] ?? ''
}

export function parseHHMM(value: string | null | undefined): number | null {
  if (!value || typeof value !== 'string') return null
  const match = value.trim().match(/^(\d{1,2}):(\d{2})$/)
  if (!match) return null
  const hours = parseInt(match[1], 10)
  const minutes = parseInt(match[2], 10)
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null
  return hours * 60 + minutes
}

export function minutesToHHMM(minutes: number): string {
  const normalized = ((Math.trunc(minutes) % FULL_DAY_MINUTES) + FULL_DAY_MINUTES) % FULL_DAY_MINUTES
  const hours = Math.floor(normalized / 60)
  const remainder = normalized % 60
  return `${String(hours).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`
}

export function isOvernightRange(open: string, close: string): boolean {
  const openMinutes = parseHHMM(open)
  const closeMinutes = parseHHMM(close)
  if (openMinutes === null || closeMinutes === null) return false
  return closeMinutes <= openMinutes
}

export function defaultWeeklyOpeningHours(): OpeningHourEntry[] {
  return DAY_DISPLAY_ORDER.map((dayOfWeek) => ({
    dayOfWeek,
    open: '10:00',
    close: '22:00',
    isClosed: false,
  }))
}

export function entriesFromLegacyOpeningHours(
  openingHours: string | null | undefined
): OpeningHourEntry[] {
  const parsed = parseOpeningHours(openingHours)
  if (!parsed) return defaultWeeklyOpeningHours()

  return DAY_DISPLAY_ORDER.map((dayOfWeek) => ({
    dayOfWeek,
    open: minutesToHHMM(parsed.openMinutes),
    close: minutesToHHMM(parsed.closeMinutes),
    isClosed: false,
  }))
}

export function openingHoursEntriesOrDefault(
  entries: OpeningHourEntry[] | null | undefined,
  legacyOpeningHours: string | null | undefined
): OpeningHourEntry[] {
  if (entries && entries.length === 7) {
    const byDay = new Map(entries.map((entry) => [entry.dayOfWeek, entry]))
    const ordered = DAY_DISPLAY_ORDER.map((dayOfWeek) => byDay.get(dayOfWeek)).filter(
      (entry): entry is OpeningHourEntry => Boolean(entry)
    )
    if (ordered.length === 7) return ordered
  }

  return entriesFromLegacyOpeningHours(legacyOpeningHours)
}

export function validateOpeningHoursEntries(entries: OpeningHourEntry[]): string | null {
  if (entries.length !== 7) return 'Jadwal harus berisi tepat 7 hari.'

  const days = new Set(entries.map((entry) => entry.dayOfWeek))
  if (days.size !== 7) return 'Hari jadwal tidak boleh duplikat.'

  for (const entry of entries) {
    if (entry.dayOfWeek < 0 || entry.dayOfWeek > 6) return 'Hari jadwal tidak valid.'
    if (entry.isClosed) continue

    if (!entry.open || !entry.close) {
      return `${formatDayName(entry.dayOfWeek)}: jam buka dan tutup wajib diisi.`
    }
    if (parseHHMM(entry.open) === null || parseHHMM(entry.close) === null) {
      return `${formatDayName(entry.dayOfWeek)}: format jam tidak valid.`
    }
  }

  return null
}

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