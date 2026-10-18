import { useEffect, useRef, useState } from 'react'
import { useChat } from '../../hooks/useChat'
import ChatPanel from './ChatPanel'

export default function ChatWidget() {
  const [open, setOpen] = useState(false)
  const launcherRef = useRef<HTMLButtonElement>(null)
  const wasOpenRef = useRef(false)
  const chat = useChat()

  // Kembalikan fokus ke tombol peluncur saat panel ditutup.
  useEffect(() => {
    if (wasOpenRef.current && !open) {
      launcherRef.current?.focus()
    }
    wasOpenRef.current = open
  }, [open])

  // Esc menutup panel.
  useEffect(() => {
    if (!open) return
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open])

  return (
    <div className="fixed bottom-5 right-5 z-40">
      {open && <ChatPanel chat={chat} onClose={() => setOpen(false)} />}

      <button
        ref={launcherRef}
        type="button"
        aria-label="Buka chat"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-terracotta text-white shadow-lg ring-1 ring-espresso/10 transition-transform duration-150 hover:scale-105 hover:bg-terracotta-strong active:scale-95"
      >
        {open ? (
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2}>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8 10h8M8 14h5m-9 6 2.4-2.4A2 2 0 0 0 7 16.2V7a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3h-5l-4 4Z"
            />
          </svg>
        )}
      </button>
    </div>
  )
}