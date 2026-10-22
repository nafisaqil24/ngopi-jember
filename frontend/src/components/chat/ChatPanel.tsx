import { useEffect, useRef, useState } from 'react'
import type { useChat } from '../../hooks/useChat'
import { CHAT_MAX_MESSAGE_LENGTH } from '../../services/chat'
import ChatShopCard from './ChatShopCard'

type ChatApi = ReturnType<typeof useChat>

const SUGGESTIONS = [
  'Kedai buka sekarang di Sumbersari',
  'Kedai murah ada WiFi',
  'Apa itu Ngopi Jember?',
]

const GREETING =
  'Halo! Saya asisten Ngopi Jember. Tanya apa saja soal kedai kopi di Jember — rekomendasi tempat, fasilitas, harga, atau info platform.'

export default function ChatPanel({ chat, onClose }: { chat: ChatApi; onClose: () => void }) {
  const { messages, loading, error, needsLocation, locationStatus, send, requestLocation, clear } =
    chat
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Fokus ke input saat panel dibuka.
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Scroll otomatis ke pesan terbaru.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' })
  }, [messages, loading])

  const canSend = value.trim().length > 0 && !loading

  function submit() {
    if (!canSend) return
    void send(value)
    setValue('')
  }

  return (
    <div
      role="dialog"
      aria-label="Chat Ngopi Jember"
      className="fixed inset-2 z-40 flex flex-col overflow-hidden rounded-2xl border border-[#E7D5C5] bg-surface shadow-2xl sm:absolute sm:inset-auto sm:bottom-16 sm:right-0 sm:h-[70vh] sm:w-96"
    >
      <header className="flex items-center justify-between gap-2 border-b-2 border-[#C2410C] bg-espresso px-4 py-3 text-cream">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold">Tanya Ngopi Jember</p>
          <p className="text-[11px] font-medium text-cream/70">Asisten rekomendasi kedai kopi</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={clear}
            className="rounded-lg px-2.5 py-1 text-[11px] font-bold text-white hover:bg-white/20 hover:text-white"
          >
            Mulai ulang
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup chat"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-white hover:bg-white/20 hover:text-white"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </header>

      <div role="log" aria-live="polite" className="flex-1 space-y-3 overflow-y-auto bg-[#FFF7ED] px-4 py-4">
        {messages.length === 0 && (
          <div className="space-y-3">
            <div className="flex items-start gap-2">
              <span
                aria-hidden
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#C2410C] text-[10px] font-bold text-white"
              >
                NJ
              </span>
              <div className="max-w-[85%] rounded-2xl rounded-tl-sm border border-[#E7D5C5] bg-white px-3.5 py-2.5 text-sm font-medium text-[#1F1A17] shadow-sm">
                <span className="whitespace-pre-line">{GREETING}</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => void send(suggestion)}
                  className="rounded-full border-[1.5px] border-[#C2410C] bg-white px-3 py-1.5 text-xs font-medium text-[#C2410C] transition duration-200 hover:bg-[#C2410C] hover:text-white"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((message, index) => (
          <div key={index} className="space-y-2">
            {message.role === 'user' ? (
              <div className="ml-auto max-w-[85%] rounded-2xl rounded-tr-sm bg-[#C2410C] px-3.5 py-2.5 text-sm font-medium text-white">
                <span className="whitespace-pre-line">{message.content}</span>
              </div>
            ) : (
              <div className="flex items-start gap-2">
                <span
                  aria-hidden
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#C2410C] text-[10px] font-bold text-white"
                >
                  NJ
                </span>
                <div className="max-w-[85%] rounded-2xl rounded-tl-sm border border-[#E7D5C5] bg-white px-3.5 py-2.5 text-sm font-medium text-[#1F1A17] shadow-sm">
                  <span className="whitespace-pre-line">{message.content}</span>
                </div>
              </div>
            )}

            {message.role === 'assistant' && message.shops && message.shops.length > 0 && (
              <div className="space-y-2">
                {message.shops.slice(0, 5).map((shop) => (
                  <ChatShopCard key={shop.slug} shop={shop} />
                ))}
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-terracotta" />
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-terracotta [animation-delay:120ms]" />
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-terracotta [animation-delay:240ms]" />
            <span className="ml-1">Sedang mengetik…</span>
          </div>
        )}

        {/* F3: minta izin lokasi saat backend butuh lokasi (kecuali sudah tersimpan). */}
        {needsLocation && (
          <div className="rounded-xl border border-terracotta/30 bg-accent-soft p-3 text-xs">
            <p className="font-semibold text-terracotta-strong">
              Biar bisa cari kedai terdekat, aku butuh lokasimu ya.
            </p>
            <p className="mt-1 font-medium text-body">
              Lokasimu tidak disimpan, hanya dipakai selama sesi chat ini.
            </p>

            {locationStatus === 'denied' ? (
              <p className="mt-2 font-semibold text-danger">
                Izin lokasi ditolak. Nggak apa-apa, sebutkan aja kecamatannya, misalnya Sumbersari.
              </p>
            ) : locationStatus === 'unavailable' ? (
              <p className="mt-2 font-medium text-body">
                Fitur lokasi tidak tersedia di perangkat/browser ini. Sebutkan aja kecamatannya,
                misalnya Sumbersari.
              </p>
            ) : locationStatus === 'timeout' || locationStatus === 'error' ? (
              <>
                <p className="mt-2 font-medium text-body">
                  {locationStatus === 'timeout'
                    ? 'Gagal mendeteksi lokasi (waktu habis). Coba lagi, atau sebutkan kecamatannya, misalnya Sumbersari.'
                    : 'Gagal mendeteksi lokasi. Coba lagi, atau sebutkan kecamatannya, misalnya Sumbersari.'}
                </p>
                <button
                  type="button"
                  onClick={() => void requestLocation()}
                  aria-label="Coba lagi deteksi lokasi"
                  className="mt-2 rounded-lg bg-terracotta px-3 py-1.5 text-xs font-bold text-white transition hover:bg-terracotta-strong"
                >
                  Coba lagi
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => void requestLocation()}
                aria-label="Izinkan lokasi"
                aria-disabled={locationStatus === 'requesting' || locationStatus === 'granted'}
                className="mt-2 rounded-lg bg-terracotta px-3 py-1.5 text-xs font-bold text-white transition hover:bg-terracotta-strong aria-disabled:opacity-60"
              >
                {locationStatus === 'requesting' || locationStatus === 'granted'
                  ? 'Mencari lokasimu...'
                  : 'Izinkan lokasi'}
              </button>
            )}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {error && <p className="px-4 pb-1 text-xs font-bold text-danger">{error}</p>}

      <form
        onSubmit={(event) => {
          event.preventDefault()
          submit()
        }}
        className="border-t border-subtle p-3"
      >
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={value}
            rows={1}
            maxLength={CHAT_MAX_MESSAGE_LENGTH}
            placeholder="Tulis pesan…"
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault()
                submit()
              }
            }}
            className="max-h-28 min-h-[42px] flex-1 resize-none rounded-xl border border-[#D6D3D1] bg-surface px-3 py-2.5 text-sm font-medium text-heading outline-none placeholder:text-[#78716C] focus:border-[#C2410C] focus:ring-2 focus:ring-[#C2410C]/30"
          />
          <button
            type="submit"
            aria-label="Kirim pesan"
            disabled={!canSend}
            className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl bg-[#C2410C] text-white shadow-sm transition hover:bg-[#9A3412] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </button>
        </div>
        <p className="mt-1 text-right font-mono text-xs font-medium text-[#78716C]">
          {value.length}/{CHAT_MAX_MESSAGE_LENGTH}
        </p>
      </form>
    </div>
  )
}