// Retry ringan untuk operasi BACA database yang gagal karena koneksi
// transien (mis. Neon menutup koneksi yang menganggur). Hanya satu kali
// percobaan ulang; error non-transien langsung dilempar tanpa diulang.
const TRANSIENT_PRISMA_CODES = new Set(['P1001', 'P1002', 'P1008', 'P1017'])
const TRANSIENT_MESSAGE = 'Server has closed the connection'

export const DB_RETRY_DELAY_MS = 300

export function isTransientDbError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const code = (error as { code?: unknown }).code
  if (typeof code === 'string' && TRANSIENT_PRISMA_CODES.has(code)) return true
  const message = (error as { message?: unknown }).message
  return typeof message === 'string' && message.includes(TRANSIENT_MESSAGE)
}

export async function withDbRetry<T>(
  operation: () => Promise<T>,
  delayMs: number = DB_RETRY_DELAY_MS
): Promise<T> {
  try {
    return await operation()
  } catch (error) {
    if (!isTransientDbError(error)) throw error
    if (delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs))
    }
    return operation()
  }
}