import { parseOpeningHours } from './openingHours'

export type OpenStatus = 'buka' | 'tutup' | 'tidak_diketahui'

// Jam sekarang (menit sejak tengah malam) menurut zona waktu Asia/Jakarta (WIB),
// bukan waktu server/browser.
export function jakartaMinutes(now: Date = new Date()): number {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Jakarta',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  const parts = formatter.formatToParts(now)
  const hourRaw = parseInt(parts.find((p) => p.type === 'hour')?.value ?? '0', 10)
  const minute = parseInt(parts.find((p) => p.type === 'minute')?.value ?? '0', 10)
  // Sebagian environment mengembalikan "24" untuk tengah malam.
  const hour = hourRaw === 24 ? 0 : hourRaw
  return hour * 60 + minute
}

// Aturan: jam buka inklusif (>=), jam tutup eksklusif (<).
// Bila closeMinutes <= openMinutes, kedai tutup lewat tengah malam:
// buka bila now >= open ATAU now < close.
function computeOpen(openMinutes: number, closeMinutes: number, nowMinutes: number): boolean {
  if (closeMinutes <= openMinutes) {
    return nowMinutes >= openMinutes || nowMinutes < closeMinutes
  }
  return nowMinutes >= openMinutes && nowMinutes < closeMinutes
}

export function isShopOpen(openTime: string, closeTime: string, now: Date = new Date()): boolean {
  const parsed = parseOpeningHours(`${openTime} - ${closeTime}`)
  if (!parsed) return false
  return computeOpen(parsed.openMinutes, parsed.closeMinutes, jakartaMinutes(now))
}

// Status efektif dengan fallback ke field `status` lama bila jam tidak dikenali,
// supaya badge tidak hilang / salah saat data jam kosong atau berformat aneh.
export function getEffectiveOpenStatus(
  openingHours: string | null | undefined,
  fallbackStatus?: string | null,
  now: Date = new Date()
): OpenStatus {
  const parsed = parseOpeningHours(openingHours)
  if (!parsed) {
    if (fallbackStatus === 'OPEN') return 'buka'
    if (fallbackStatus === 'CLOSED' || fallbackStatus === 'TEMPORARILY_CLOSED') return 'tutup'
    return 'tidak_diketahui'
  }
  return computeOpen(parsed.openMinutes, parsed.closeMinutes, jakartaMinutes(now)) ? 'buka' : 'tutup'
}