import { ApiError, apiUrl } from './coffeeShop'

// Bentuk tiap kedai pada respons chat. Dipetakan langsung dari
// PublicShopResult di backend (backend/src/chat/search.service.ts).
export type ChatShop = {
  slug: string
  name: string
  district: string
  address: string
  priceRange: string
  openingHours: string
  latitude: number | null
  longitude: number | null
  description: string
  categories: string[]
  facilities: string[]
  rating: number | null
  reviewCount: number
  image: string | null
  distanceKm?: number
  openStatus?: 'buka' | 'tutup' | 'tidak_diketahui'
}

export type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
}

export type ChatResponse = {
  reply: string
  shops?: ChatShop[]
  needsLocation?: boolean
}

export type SendChatParams = {
  message: string
  location?: { lat: number; lng: number }
  history?: ChatMessage[]
  signal?: AbortSignal
}

type ChatApiPayload = { success?: boolean; message?: string; data?: ChatResponse }

// Batasan ini harus sama dengan validasi backend (chat.routes.ts / schema).
export const CHAT_MAX_MESSAGE_LENGTH = 300
export const CHAT_MAX_HISTORY = 4

// Ambil maksimal 4 pesan terakhir, buang content kosong (setelah trim),
// lalu potong tiap content ke 300 karakter agar tidak ditolak backend.
export function buildChatHistory(history?: ChatMessage[]): ChatMessage[] {
  if (!history || history.length === 0) return []
  return history
    .map((item) => ({ role: item.role, content: item.content.trim() }))
    .filter((item) => item.content.length > 0)
    .slice(-CHAT_MAX_HISTORY)
    .map((item) => ({ role: item.role, content: item.content.slice(0, CHAT_MAX_MESSAGE_LENGTH) }))
}

export async function sendChatMessage({
  message,
  location,
  history,
  signal,
}: SendChatParams): Promise<ChatResponse> {
  const trimmed = (message ?? '').trim()
  if (trimmed.length === 0) {
    throw new ApiError('Pesan tidak boleh kosong')
  }
  if (trimmed.length > CHAT_MAX_MESSAGE_LENGTH) {
    throw new ApiError('Pesan terlalu panjang, maksimal 300 karakter')
  }

  const body: { message: string; location?: { lat: number; lng: number }; history?: ChatMessage[] } = {
    message: trimmed,
  }
  if (location) body.location = location
  const preparedHistory = buildChatHistory(history)
  if (preparedHistory.length > 0) body.history = preparedHistory

  let response: Response
  try {
    response = await fetch(`${apiUrl}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal,
    })
  } catch (err) {
    if ((err as { name?: string })?.name === 'AbortError') throw err
    throw new ApiError('Koneksi bermasalah, coba lagi ya')
  }

  let payload: ChatApiPayload | null = null
  try {
    payload = (await response.json()) as ChatApiPayload
  } catch {
    payload = null
  }

  if (!response.ok || !payload || payload.success !== true) {
    if (response.status === 413) throw new ApiError('Pesanmu terlalu panjang')
    if (response.status === 429) throw new ApiError('Terlalu banyak pesan, tunggu sebentar ya')
    const backendMessage = payload && typeof payload.message === 'string' ? payload.message : ''
    if (response.status === 400) throw new ApiError(backendMessage || 'Format pesan tidak valid')
    throw new ApiError(backendMessage || 'Terjadi kesalahan pada server')
  }

  return payload.data as ChatResponse
}