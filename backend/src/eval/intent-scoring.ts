import type { ParsedIntent } from '../chat/schema.js'
import { intentEnum, faqTopicsEnum, priorityLevelEnum } from '../chat/schema.js'

export type PriorityKey = 'distance' | 'price' | 'rating' | 'facility'
export type PriorityLevel = 'tinggi' | 'normal' | 'rendah'

export interface IntentExpectation {
  // Boleh berupa daftar untuk kasus injeksi prompt yang menerima lebih dari
  // satu intent aman (mis. out_of_scope atau smalltalk).
  intent: string | string[]
  shopQueryContains?: string
  facilitySlugsInclude?: string[]
  maxPrice?: number
  openNow?: boolean
  priorities?: Partial<Record<PriorityKey, PriorityLevel>>
  faqTopic?: string
}

export interface IntentDatasetEntry {
  id: string
  category: string
  text: string
  expect: IntentExpectation
}

export interface PredictionScore {
  intentCorrect: boolean
  fullCorrect: boolean
  failures: string[]
}

export interface DatasetValidationResult {
  ok: boolean
  errors: string[]
  countsByCategory: Record<string, number>
  total: number
}

const PRIORITY_KEYS: PriorityKey[] = ['distance', 'price', 'rating', 'facility']
const EXPECT_KEYS = new Set([
  'intent',
  'shopQueryContains',
  'facilitySlugsInclude',
  'maxPrice',
  'openNow',
  'priorities',
  'faqTopic',
])
const INTENT_VALUES = new Set<string>(intentEnum.options)
const FAQ_VALUES = new Set<string>(faqTopicsEnum.options)
const PRIORITY_VALUES = new Set<string>(priorityLevelEnum.options)

export function normalizeName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '')
}

export function scorePrediction(expect: IntentExpectation, actual: ParsedIntent): PredictionScore {
  const failures: string[] = []
  const expectedIntents = Array.isArray(expect.intent) ? expect.intent : [expect.intent]
  const intentCorrect = expectedIntents.includes(actual.intent)
  if (!intentCorrect) {
    failures.push(`intent: expected ${expectedIntents.join('|')} got ${actual.intent}`)
  }

  if (expect.shopQueryContains !== undefined) {
    const expectedName = normalizeName(expect.shopQueryContains)
    const actualName = normalizeName(actual.shopQuery ?? '')
    if (!expectedName || !actualName.includes(expectedName)) {
      failures.push(
        `shopQuery: expected contains "${expect.shopQueryContains}" got "${actual.shopQuery ?? ''}"`
      )
    }
  }

  if (expect.facilitySlugsInclude !== undefined) {
    const actualSlugs = new Set(actual.filters?.facilitySlugs ?? [])
    const missing = expect.facilitySlugsInclude.filter((slug) => !actualSlugs.has(slug))
    if (missing.length > 0) {
      failures.push(`facilitySlugs: missing ${missing.join(',')}`)
    }
  }

  if (expect.maxPrice !== undefined) {
    if (actual.filters?.maxPrice !== expect.maxPrice) {
      failures.push(`maxPrice: expected ${expect.maxPrice} got ${String(actual.filters?.maxPrice)}`)
    }
  }

  if (expect.openNow !== undefined) {
    if (actual.filters?.openNow !== expect.openNow) {
      failures.push(`openNow: expected ${expect.openNow} got ${String(actual.filters?.openNow)}`)
    }
  }

  if (expect.priorities !== undefined) {
    for (const key of PRIORITY_KEYS) {
      const expectedLevel = expect.priorities[key]
      if (expectedLevel === undefined) continue
      const actualLevel = actual.priorities?.[key]
      if (actualLevel !== expectedLevel) {
        failures.push(`priorities.${key}: expected ${expectedLevel} got ${String(actualLevel)}`)
      }
    }
  }

  if (expect.faqTopic !== undefined) {
    if (actual.faqTopic !== expect.faqTopic) {
      failures.push(`faqTopic: expected ${expect.faqTopic} got ${String(actual.faqTopic)}`)
    }
  }

  return {
    intentCorrect,
    fullCorrect: intentCorrect && failures.length === 0,
    failures,
  }
}

export function validateIntentDataset(raw: unknown): DatasetValidationResult {
  const errors: string[] = []
  const countsByCategory: Record<string, number> = {}

  if (!Array.isArray(raw)) {
    return { ok: false, errors: ['dataset harus berupa array'], countsByCategory, total: 0 }
  }

  const seenIds = new Set<string>()

  raw.forEach((entry, index) => {
    const prefix = `[${index}]`
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      errors.push(`${prefix} entri harus berupa objek`)
      return
    }

    const item = entry as Record<string, unknown>

    if (typeof item.id !== 'string' || item.id.trim() === '') {
      errors.push(`${prefix} id wajib berupa string`)
    } else if (seenIds.has(item.id)) {
      errors.push(`${prefix} id duplikat: ${item.id}`)
    } else {
      seenIds.add(item.id)
    }

    if (typeof item.category !== 'string' || item.category.trim() === '') {
      errors.push(`${prefix} category wajib berupa string`)
    } else {
      countsByCategory[item.category] = (countsByCategory[item.category] ?? 0) + 1
    }

    if (typeof item.text !== 'string' || item.text.trim() === '') {
      errors.push(`${prefix} text wajib berupa string tidak kosong`)
    }

    const expect = item.expect
    if (!expect || typeof expect !== 'object' || Array.isArray(expect)) {
      errors.push(`${prefix} expect wajib berupa objek`)
      return
    }

    const exp = expect as Record<string, unknown>
    for (const key of Object.keys(exp)) {
      if (!EXPECT_KEYS.has(key)) errors.push(`${prefix} expect.${key} tidak dikenal`)
    }

    const intents = Array.isArray(exp.intent) ? exp.intent : [exp.intent]
    if (exp.intent === undefined || intents.length === 0) {
      errors.push(`${prefix} expect.intent wajib diisi`)
    } else {
      for (const intent of intents) {
        if (typeof intent !== 'string' || !INTENT_VALUES.has(intent)) {
          errors.push(`${prefix} expect.intent tidak valid: ${String(intent)}`)
        }
      }
    }

    if (exp.faqTopic !== undefined) {
      if (typeof exp.faqTopic !== 'string' || !FAQ_VALUES.has(exp.faqTopic)) {
        errors.push(`${prefix} expect.faqTopic tidak valid: ${String(exp.faqTopic)}`)
      }
    }

    if (exp.shopQueryContains !== undefined && typeof exp.shopQueryContains !== 'string') {
      errors.push(`${prefix} expect.shopQueryContains harus string`)
    }

    if (exp.facilitySlugsInclude !== undefined) {
      if (
        !Array.isArray(exp.facilitySlugsInclude) ||
        exp.facilitySlugsInclude.some((slug) => typeof slug !== 'string')
      ) {
        errors.push(`${prefix} expect.facilitySlugsInclude harus array string`)
      }
    }

    if (exp.maxPrice !== undefined && typeof exp.maxPrice !== 'number') {
      errors.push(`${prefix} expect.maxPrice harus angka`)
    }

    if (exp.openNow !== undefined && typeof exp.openNow !== 'boolean') {
      errors.push(`${prefix} expect.openNow harus boolean`)
    }

    if (exp.priorities !== undefined) {
      if (!exp.priorities || typeof exp.priorities !== 'object' || Array.isArray(exp.priorities)) {
        errors.push(`${prefix} expect.priorities harus objek`)
      } else {
        for (const [key, level] of Object.entries(exp.priorities)) {
          if (!PRIORITY_KEYS.includes(key as PriorityKey)) {
            errors.push(`${prefix} expect.priorities.${key} tidak dikenal`)
          } else if (typeof level !== 'string' || !PRIORITY_VALUES.has(level)) {
            errors.push(`${prefix} expect.priorities.${key} tidak valid: ${String(level)}`)
          }
        }
      }
    }
  })

  return { ok: errors.length === 0, errors, countsByCategory, total: raw.length }
}