export interface MinuteRange {
  openMinutes: number
  closeMinutes: number
}

export type OpenStatus = 'buka' | 'tutup' | 'tidak_diketahui'

export interface OpeningHourEntry {
  dayOfWeek: number
  openMinutes: number
  closeMinutes: number
  isClosed: boolean
}

export interface OpenStatusInput {
  status?: string | null
  openingHourEntries?: OpeningHourEntry[] | null
  openingHours?: string | null
}

export interface JakartaTime {
  dayOfWeek: number
  minutes: number
}

export interface OpeningHourInput {
  dayOfWeek: number
  open?: string | null
  close?: string | null
  isClosed?: boolean | null
}

export interface OpeningHourResponse {
  dayOfWeek: number
  open: string
  close: string
  isClosed: boolean
}

const HHMM_PATTERN = /^(\d{1,2})[:.](\d{2})$/
const LEGACY_RANGE_PATTERN = /(\d{1,2})[:.](\d{2})\s*(?:-|–|—|to)\s*(\d{1,2})[:.](\d{2})/i

export function parseHHMM(str: string | null | undefined): number | null {
  if (!str || typeof str !== 'string') return null

  const match = str.trim().match(HHMM_PATTERN)
  if (!match) return null

  const hours = parseInt(match[1], 10)
  const minutes = parseInt(match[2], 10)
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null

  return hours * 60 + minutes
}

export function normalizeRange(open: number, close: number): MinuteRange {
  if (!Number.isInteger(open) || !Number.isInteger(close)) {
    throw new RangeError('open dan close harus bilangan bulat (menit)')
  }
  if (open < 0 || open > 1439 || close < 0 || close > 1440) {
    throw new RangeError('rentang menit di luar batas yang didukung')
  }

  return {
    openMinutes: open,
    closeMinutes: close <= open ? close + 1440 : close,
  }
}

export function parseLegacyOpeningHours(str: string | null | undefined): MinuteRange | null {
  if (!str || typeof str !== 'string') return null

  if (/24\s*jam/i.test(str)) {
    return { openMinutes: 0, closeMinutes: 1440 }
  }

  const match = str.trim().match(LEGACY_RANGE_PATTERN)
  if (!match) return null

  const openMinutes = parseHHMM(`${match[1]}:${match[2]}`)
  const closeMinutes = parseHHMM(`${match[3]}:${match[4]}`)
  if (openMinutes === null || closeMinutes === null) return null

  return normalizeRange(openMinutes, closeMinutes)
}

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
}

const jakartaFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Asia/Jakarta',
  weekday: 'short',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

// Hari (0=Minggu..6=Sabtu) dan menit sejak 00:00 menurut Asia/Jakarta.
// Tidak memakai getDay()/getHours() supaya timezone server tidak berpengaruh.
export function getJakartaTime(now: Date = new Date()): JakartaTime {
  const parts = jakartaFormatter.formatToParts(now)
  const weekday = parts.find((p) => p.type === 'weekday')?.value ?? ''
  const hourRaw = parseInt(parts.find((p) => p.type === 'hour')?.value ?? '0', 10)
  const minute = parseInt(parts.find((p) => p.type === 'minute')?.value ?? '0', 10)
  // Sebagian environment mengembalikan "24" untuk tengah malam.
  const hour = hourRaw === 24 ? 0 : hourRaw
  const dayOfWeek = WEEKDAY_INDEX[weekday] ?? 0

  return { dayOfWeek, minutes: hour * 60 + minute }
}

// Batas tutup eksklusif: menit == closeMinutes berarti sudah tutup.
export function getOpenStatus(input: OpenStatusInput, now: Date = new Date()): OpenStatus {
  if (input.status === 'CLOSED' || input.status === 'TEMPORARILY_CLOSED') {
    return 'tutup'
  }

  const entries = input.openingHourEntries ?? []
  const { dayOfWeek, minutes } = getJakartaTime(now)

  if (entries.length > 0) {
    const today = entries.find((entry) => entry.dayOfWeek === dayOfWeek)
    if (
      today &&
      !today.isClosed &&
      minutes >= today.openMinutes &&
      minutes < today.closeMinutes
    ) {
      return 'buka'
    }

    // Dini hari numpang jadwal hari kemarin yang tutup lewat tengah malam.
    const yesterdayDow = (dayOfWeek + 6) % 7
    const yesterday = entries.find((entry) => entry.dayOfWeek === yesterdayDow)
    if (
      yesterday &&
      !yesterday.isClosed &&
      yesterday.closeMinutes > 1440 &&
      minutes + 1440 < yesterday.closeMinutes
    ) {
      return 'buka'
    }

    return 'tutup'
  }

  const legacy = parseLegacyOpeningHours(input.openingHours)
  if (!legacy) return 'tidak_diketahui'

  if (minutes >= legacy.openMinutes && minutes < legacy.closeMinutes) return 'buka'
  if (legacy.closeMinutes > 1440 && minutes + 1440 < legacy.closeMinutes) return 'buka'
  return 'tutup'
}

const DAY_LABELS: Record<number, string> = {
  0: 'Min',
  1: 'Sen',
  2: 'Sel',
  3: 'Rab',
  4: 'Kam',
  5: 'Jum',
  6: 'Sab',
}

// Urutan tampil Senin..Minggu.
const DISPLAY_DAY_ORDER = [1, 2, 3, 4, 5, 6, 0]

export function minutesToHHMM(minutes: number): string {
  const normalized = ((Math.trunc(minutes) % 1440) + 1440) % 1440
  const hours = Math.floor(normalized / 60)
  const remainder = normalized % 60
  return `${String(hours).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`
}

export function entryFromInput(input: OpeningHourInput): OpeningHourEntry {
  const dayOfWeek = input.dayOfWeek

  if (input.isClosed) {
    return { dayOfWeek, openMinutes: 0, closeMinutes: 0, isClosed: true }
  }

  const open = parseHHMM(input.open ?? null)
  const close = parseHHMM(input.close ?? null)
  if (open === null || close === null) {
    throw new RangeError('open dan close wajib diisi dengan format HH:MM jika isClosed false')
  }

  const range = normalizeRange(open, close)
  return {
    dayOfWeek,
    openMinutes: range.openMinutes,
    closeMinutes: range.closeMinutes,
    isClosed: false,
  }
}

export function buildOpeningHoursSummary(entries: OpeningHourEntry[]): string {
  const byDay = new Map(entries.map((entry) => [entry.dayOfWeek, entry]))

  interface Group {
    days: number[]
    entry: OpeningHourEntry
  }

  const groups: Group[] = []
  for (const dayOfWeek of DISPLAY_DAY_ORDER) {
    const entry = byDay.get(dayOfWeek)
    if (!entry) continue

    const last = groups[groups.length - 1]
    const sameAsLast =
      last &&
      last.entry.isClosed === entry.isClosed &&
      (entry.isClosed ||
        (last.entry.openMinutes === entry.openMinutes &&
          last.entry.closeMinutes === entry.closeMinutes))

    if (sameAsLast) {
      last.days.push(dayOfWeek)
    } else {
      groups.push({ days: [dayOfWeek], entry })
    }
  }

  return groups
    .map((group) => {
      const firstDay = group.days[0]
      const lastDay = group.days[group.days.length - 1]
      const label =
        group.days.length === 1
          ? DAY_LABELS[firstDay]
          : `${DAY_LABELS[firstDay]}-${DAY_LABELS[lastDay]}`

      if (group.entry.isClosed) return `${label} tutup`
      return `${label} ${minutesToHHMM(group.entry.openMinutes)}-${minutesToHHMM(group.entry.closeMinutes)}`
    })
    .join(', ')
}

export function entriesToResponse(entries: OpeningHourEntry[]): OpeningHourResponse[] {
  const byDay = new Map(entries.map((entry) => [entry.dayOfWeek, entry]))

  return DISPLAY_DAY_ORDER.flatMap((dayOfWeek) => {
    const entry = byDay.get(dayOfWeek)
    if (!entry) return []
    return [
      {
        dayOfWeek,
        open: minutesToHHMM(entry.openMinutes),
        close: minutesToHHMM(entry.closeMinutes),
        isClosed: entry.isClosed,
      },
    ]
  })
}