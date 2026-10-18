import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError } from '../services/coffeeShop'
import { sendChatMessage, type ChatMessage, type ChatShop } from '../services/chat'
import { useGeolocation } from './useGeolocation'

export type ChatTurn = ChatMessage & { shops?: ChatShop[] }

export type ChatLocation = { lat: number; lng: number }

// Error "transport" (bukan penolakan lokasi oleh backend). Saat membawa
// location, error di luar daftar ini dianggap backend menolak lokasi.
const NON_LOCATION_ERROR_MESSAGES = new Set([
  'Koneksi bermasalah, coba lagi ya',
  'Terlalu banyak pesan, tunggu sebentar ya',
  'Pesanmu terlalu panjang',
  'Terjadi kesalahan pada server',
])

function withKecamatanHint(message: string): string {
  return `${message} Sebutkan aja kecamatannya, misalnya Sumbersari.`
}

export function useChat() {
  const [messages, setMessages] = useState<ChatTurn[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [needsLocation, setNeedsLocation] = useState(false)
  const [pendingMessage, setPendingMessage] = useState<string | null>(null)

  const abortRef = useRef<AbortController | null>(null)
  const inFlightRef = useRef(false)
  const messagesRef = useRef<ChatTurn[]>([])
  const pendingRef = useRef<string | null>(null)
  // Koordinat hanya di memori selama sesi chat; hilang saat clear()/refresh.
  const savedLocationRef = useRef<ChatLocation | null>(null)

  const { status: locationStatus, request: requestGeo, reset: resetGeo } = useGeolocation()

  const updateMessages = useCallback((updater: (prev: ChatTurn[]) => ChatTurn[]) => {
    messagesRef.current = updater(messagesRef.current)
    setMessages(messagesRef.current)
  }, [])

  const clear = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    inFlightRef.current = false
    messagesRef.current = []
    pendingRef.current = null
    savedLocationRef.current = null
    resetGeo()
    setMessages([])
    setLoading(false)
    setError('')
    setNeedsLocation(false)
    setPendingMessage(null)
  }, [resetGeo])

  const runSend = useCallback(
    async (text: string, location: ChatLocation | undefined, appendUser: boolean) => {
      if (inFlightRef.current) return
      const trimmed = text.trim()
      if (!trimmed) return

      const base = messagesRef.current
      // Saat mengirim ulang pesan tertunda (appendUser=false), pesan user
      // sudah ada di daftar, jadi jangan masukkan lagi ke history.
      const history: ChatMessage[] = (appendUser ? base : base.slice(0, -1)).map(
        ({ role, content }) => ({ role, content })
      )
      const userTurn: ChatTurn = { role: 'user', content: trimmed }

      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller

      inFlightRef.current = true
      setLoading(true)
      setError('')
      setNeedsLocation(false)
      setPendingMessage(null)
      pendingRef.current = null
      if (appendUser) updateMessages((prev) => [...prev, userTurn])

      try {
        const result = await sendChatMessage({
          message: trimmed,
          location,
          history,
          signal: controller.signal,
        })
        updateMessages((prev) => [
          ...prev,
          { role: 'assistant', content: result.reply, shops: result.shops },
        ])
        // Jangan minta izin lagi bila koordinat sudah tersimpan (anti-loop).
        if (result.needsLocation && !savedLocationRef.current) {
          setNeedsLocation(true)
          setPendingMessage(trimmed)
          pendingRef.current = trimmed
        }
      } catch (err) {
        if ((err as { name?: string })?.name === 'AbortError') return
        if (err instanceof ApiError) {
          if (location && !NON_LOCATION_ERROR_MESSAGES.has(err.message)) {
            // Backend menolak lokasi (mis. di luar Jember): buang koordinat tersimpan.
            savedLocationRef.current = null
            setError(withKecamatanHint(err.message))
          } else {
            setError(err.message)
          }
        } else {
          setError('Terjadi kesalahan, coba lagi ya')
        }
      } finally {
        if (abortRef.current === controller) {
          abortRef.current = null
          inFlightRef.current = false
          setLoading(false)
        }
      }
    },
    [updateMessages]
  )

  const send = useCallback(
    (text: string, location?: ChatLocation) =>
      runSend(text, location ?? savedLocationRef.current ?? undefined, true),
    [runSend]
  )

  // Dipanggil dari klik tombol "Izinkan lokasi"/"Coba lagi" — bukan otomatis.
  const requestLocation = useCallback(async () => {
    if (inFlightRef.current || locationStatus === 'requesting') return
    const pending = pendingRef.current
    const coords = await requestGeo()
    if (!coords) return
    savedLocationRef.current = coords
    if (pending) await runSend(pending, coords, false)
  }, [locationStatus, requestGeo, runSend])

  // Batalkan request yang masih jalan saat komponen unmount.
  useEffect(() => {
    return () => {
      abortRef.current?.abort()
    }
  }, [])

  return {
    messages,
    loading,
    error,
    needsLocation,
    pendingMessage,
    locationStatus,
    send,
    requestLocation,
    clear,
  }
}