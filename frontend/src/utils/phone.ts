const MIN_DIGITS = 9
const MAX_DIGITS = 15

export function normalizeWhatsAppNumber(phone: string | null | undefined): string | null {
  if (!phone) return null

  const digits = phone.replace(/\D/g, '')
  if (!digits) return null

  let normalized: string
  if (digits.startsWith('62')) {
    normalized = digits
  } else if (digits.startsWith('0')) {
    normalized = `62${digits.slice(1)}`
  } else if (digits.startsWith('8')) {
    normalized = `62${digits}`
  } else {
    return null
  }

  if (normalized.length < MIN_DIGITS || normalized.length > MAX_DIGITS) {
    return null
  }

  return normalized
}