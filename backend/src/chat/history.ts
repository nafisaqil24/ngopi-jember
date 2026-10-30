// Sanitasi history chat dari klien sebelum diteruskan ke LLM.
// Hanya entri role "user" yang diterima; role lain dibuang agar klien tidak
// bisa menyelundupkan instruksi ber-role assistant/system.
export const CHAT_HISTORY_MAX_ENTRIES = 4
export const CHAT_HISTORY_MAX_CHARS = 300

export interface SanitizedChatHistoryEntry {
  role: 'user'
  content: string
}

export function sanitizeHistory(raw: unknown): SanitizedChatHistoryEntry[] {
  if (!Array.isArray(raw)) return []

  const users: SanitizedChatHistoryEntry[] = []
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue

    const role = (entry as { role?: unknown }).role
    if (role !== 'user') continue

    const content = (entry as { content?: unknown }).content
    if (typeof content !== 'string') continue

    const trimmed = content.trim()
    if (!trimmed) continue

    users.push({ role: 'user', content: trimmed.slice(0, CHAT_HISTORY_MAX_CHARS) })
  }

  return users.slice(-CHAT_HISTORY_MAX_ENTRIES)
}