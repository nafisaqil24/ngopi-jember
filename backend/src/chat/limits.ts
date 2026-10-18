import rateLimit from 'express-rate-limit'

// Per-IP rate limiters using express-rate-limit
export const chatMinuteLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Terlalu banyak permintaan chat. Mohon tunggu sebentar sebelum mencoba lagi.',
  },
})

export const chatHourLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Batas maksimum permintaan chat per jam telah tercapai. Coba lagi nanti.',
  },
})

// In-memory daily total counter for LLM calls
let dailyCallCount = 0
let lastResetDate = new Date().toDateString()

export function checkAndIncrementDailyLimit(): boolean {
  const today = new Date().toDateString()
  if (today !== lastResetDate) {
    dailyCallCount = 0
    lastResetDate = today
  }

  const dailyLimit = Number(process.env.CHAT_DAILY_LIMIT || 800)
  if (dailyCallCount >= dailyLimit) {
    return false
  }

  dailyCallCount++
  return true
}
