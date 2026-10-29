// Klasifikasi error provider LLM dalam satu tempat.
// Pesan user bersifat ramah & spesifik per jenis, dan JANGAN pernah memuat
// detail sensitif (API key, header, isi pesan pengguna, body mentah provider).
export type LlmErrorKind =
  | 'timeout'
  | 'rate_limit'
  | 'auth'
  | 'quota'
  | 'invalid_response'
  | 'unknown'

export interface LlmErrorMeta {
  httpStatus: number
  userMessage: string
}

export const LLM_ERROR_META: Record<LlmErrorKind, LlmErrorMeta> = {
  timeout: {
    httpStatus: 504,
    userMessage: 'Chatbot lagi lama merespons, coba lagi sebentar ya.',
  },
  rate_limit: {
    httpStatus: 503,
    userMessage: 'Chatbot lagi sibuk, coba lagi sebentar ya.',
  },
  auth: {
    httpStatus: 503,
    userMessage: 'Chatbot sedang ada gangguan, coba lagi nanti ya.',
  },
  quota: {
    httpStatus: 503,
    userMessage: 'Chatbot lagi sibuk, coba lagi nanti ya.',
  },
  invalid_response: {
    httpStatus: 502,
    userMessage: 'Chatbot memberi jawaban yang tidak bisa diproses, coba lagi ya.',
  },
  unknown: {
    httpStatus: 502,
    userMessage: 'Chatbot sedang ada gangguan, coba lagi nanti ya.',
  },
}

export interface LlmErrorDetails {
  providerStatus?: number
  providerCode?: string
}

export class LlmError extends Error {
  readonly kind: LlmErrorKind
  readonly httpStatus: number
  readonly userMessage: string
  readonly providerStatus?: number
  readonly providerCode?: string

  constructor(kind: LlmErrorKind, details: LlmErrorDetails = {}) {
    const meta = LLM_ERROR_META[kind]
    const statusPart = details.providerStatus !== undefined ? ` status=${details.providerStatus}` : ''
    super(`LLM error kind=${kind}${statusPart}`)
    this.name = 'LlmError'
    this.kind = kind
    this.httpStatus = meta.httpStatus
    this.userMessage = meta.userMessage
    this.providerStatus = details.providerStatus
    this.providerCode = details.providerCode
  }
}

// Petakan status HTTP provider + code opsional ke jenis error.
export function classifyHttpStatus(status: number, providerCode?: string): LlmErrorKind {
  const code = (providerCode || '').toLowerCase()

  if (status === 401 || status === 403) return 'auth'
  if (status === 402) return 'quota'
  if (status === 429) return 'rate_limit'

  if (code.includes('quota') || code === 'billing_hard_limit_reached') return 'quota'
  if (code.includes('rate_limit') || code.includes('rate limit')) return 'rate_limit'
  if (code.includes('api_key') || code.includes('authentication')) return 'auth'

  return 'unknown'
}

// Petakan exception jaringan (mis. fetch gagal) ke jenis error.
export function classifyException(err: unknown): LlmErrorKind {
  const name = (err as { name?: string } | undefined)?.name
  if (name === 'TimeoutError' || name === 'AbortError') return 'timeout'
  return 'unknown'
}
