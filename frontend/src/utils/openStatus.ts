import { parseHHMM, parseOpeningHours, type ParsedOpeningHours } from './openingHours'
import type { OpeningHourEntry, OpenStatus } from '../types/coffeeShop'

export type { OpenStatus } from '../types/coffeeShop'

export interface OpenStatusInput {
  status?: string | null
  openingHourEntries?: OpeningHourEntry[] | null
  openingHours?: string | null
}

interface JakartaTime {
  dayOfWeek: number
  minutes: number
}

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
}

const jakartaFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Asia/Jakarta',
  weekday: 'short',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

// Hari (0=Minggu..6=Sabtu) dan menit sejak 00:00 menurut Asia/Jakarta,
// bukan timezone browser/server.
function getJakartaTime(now: Date = new Date()): JakartaTime {
  const parts = jakartaFormatter.formatToParts(now)
  const weekday = parts.find((part) => part.type === 'weekday')?.value ?? ''
  const hourRaw = parseInt(parts.find((part) => part.type === 'hour')?.value ?? '0', 10)
  const minute = parseInt(parts.find((part) => part.type === 'minute')?.value ?? '0', 10)
  // Sebagian environment mengembalikan "24" untuk tengah malam.
  const hour = hourRaw === 24 ? 0 : hourRaw

  return {
    dayOfWeek: WEEKDAY_INDEX[weekday] ?? 0,
    minutes: hour * 60 + minute,
  }
}

export function getTodayDayOfWeekJakarta(now: Date = new Date()): number {
  return getJakartaTime(now).dayOfWeek
}

export function jakartaMinutes(now: Date = new Date()): number {
  return getJakartaTime(now).minutes
}

// Batas tutup eksklusif: menit == closeMinutes berarti sudah tutup.
// closeMinutes yang > 1440 berarti tutup lewat tengah malam.
function isWithinRange(openMinutes: number, closeMinutes: number, nowMinutes: number): boolean {
  if (closeMinutes > 1440) {
    return (
      (nowMinutes >= openMinutes && nowMinutes < closeMinutes) ||
      nowMinutes + 1440 < closeMinutes
    )
  }
  return nowMinutes >= openMinutes && nowMinutes < closeMinutes
}

function normalizeLegacy(parsed: ParsedOpeningHours): { openMinutes: number; closeMinutes: number } {
  return {
    openMinutes: parsed.openMinutes,
    closeMinutes:
      parsed.closeMinutes <= parsed.openMinutes
        ? parsed.closeMinutes + 1440
        : parsed.closeMinutes,
  }
}

function normalizedEntryRange(
  entry: OpeningHourEntry
): { openMinutes: number; closeMinutes: number } | null {
  if (entry.isClosed) return null

  const openMinutes = parseHHMM(entry.open)
  const closeMinutes = parseHHMM(entry.close)
  if (openMinutes === null || closeMinutes === null) return null

  return {
    openMinutes,
    closeMinutes: closeMinutes <= openMinutes ? closeMinutes + 1440 : closeMinutes,
  }
}

export function isShopOpen(openTime: string, closeTime: string, now: Date = new Date()): boolean {
  const parsed = parseOpeningHours(`${openTime} - ${closeTime}`)
  if (!parsed) return false
  const range = normalizeLegacy(parsed)
  return isWithinRange(range.openMinutes, range.closeMinutes, jakartaMinutes(now))
}

export function getEffectiveOpenStatus(input: OpenStatusInput, now: Date = new Date()): OpenStatus {
  if (input.status === 'CLOSED' || input.status === 'TEMPORARILY_CLOSED') {
    return 'tutup'
  }

  const entries = input.openingHourEntries ?? []
  const { dayOfWeek, minutes } = getJakartaTime(now)

  if (entries.length > 0) {
    const today = entries.find((entry) => entry.dayOfWeek === dayOfWeek)
    if (today && !today.isClosed) {
      const range = normalizedEntryRange(today)
      if (range && minutes >= range.openMinutes && minutes < range.closeMinutes) {
        return 'buka'
      }
    }

    // Dini hari numpang jadwal hari kemarin yang tutup lewat tengah malam.
    const yesterdayDow = (dayOfWeek + 6) % 7
    const yesterday = entries.find((entry) => entry.dayOfWeek === yesterdayDow)
    if (yesterday && !yesterday.isClosed) {
      const range = normalizedEntryRange(yesterday)
      if (range && range.closeMinutes > 1440 && minutes + 1440 < range.closeMinutes) {
        return 'buka'
      }
    }

    return 'tutup'
  }

  const parsed = parseOpeningHours(input.openingHours)
  if (!parsed) return 'tidak_diketahui'

  const range = normalizeLegacy(parsed)
  return isWithinRange(range.openMinutes, range.closeMinutes, minutes) ? 'buka' : 'tutup'
}