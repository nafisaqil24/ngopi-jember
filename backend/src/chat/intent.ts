import { buildSystemPrompt } from './prompts.js'
import { callLlmChat, isLlmEnabled, ChatMessage } from './llm.client.js'
import { parsedIntentSchema, intentEnum, ParsedIntent } from './schema.js'
import { LlmError } from './llm.errors.js'
import { prisma } from '../lib/prisma.js'
import { withDbRetry } from '../utils/dbRetry.js'

const KNOWN_INTENT_VALUES = new Set<string>(intentEnum.options)

// Intent mentah hanya dicatat bila berupa string pendek dan dikenal. Selain itu
// "unknown" supaya log tidak memuat output LLM utuh.
function shortRawIntent(parsedJson: unknown): string {
  if (!parsedJson || typeof parsedJson !== 'object') return 'unknown'
  const raw = (parsedJson as { intent?: unknown }).intent
  if (typeof raw !== 'string') return 'unknown'
  const trimmed = raw.trim()
  if (trimmed.length === 0 || trimmed.length > 40) return 'unknown'
  return KNOWN_INTENT_VALUES.has(trimmed) ? trimmed : 'unknown'
}

function formatZodIssues(issues: { path: PropertyKey[]; code: string }[]): string {
  return issues
    .map((issue) => {
      const path = issue.path.join('.')
      return path ? `${path}:${issue.code}` : issue.code
    })
    .join(',')
}

// Buang key bernilai null secara rekursif (termasuk di dalam filters).
// Model (mis. gpt-oss) sering mengisi "shopQuery": null / "faqTopic": null,
// dan skema .strict() menolak null; normalisasi ini membuat hasil tetap valid
// tanpa melonggarkan skema.
function stripNullKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(stripNullKeys)
  }
  if (value && typeof value === 'object') {
    const result: Record<string, unknown> = {}
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      if (val === null) continue
      result[key] = stripNullKeys(val)
    }
    return result
  }
  return value
}

export async function parseUserIntent(
  userMessage: string,
  history: { role: 'user' | 'assistant'; content: string }[] = []
): Promise<ParsedIntent> {
  if (!isLlmEnabled()) {
    console.warn('[Intent] reason=llm_disabled')
    return {
      intent: 'smalltalk',
    }
  }

  try {
    const systemPrompt = await buildSystemPrompt()
    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...history.map((h) => ({ role: h.role, content: h.content })),
      { role: 'user', content: userMessage },
    ]

    const rawContent = await callLlmChat(messages)

    // Try parsing JSON
    let parsedJson: any
    try {
      parsedJson = JSON.parse(rawContent)
    } catch {
      // Fallback if markdown fenced
      const jsonMatch = rawContent.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new LlmError('invalid_response')
      }
      try {
        parsedJson = JSON.parse(jsonMatch[0])
      } catch {
        throw new LlmError('invalid_response')
      }
    }

    // Validate with Zod
    const normalizedJson = stripNullKeys(parsedJson)
    const validationResult = parsedIntentSchema.safeParse(normalizedJson)
    if (!validationResult.success) {
      const issues = validationResult.error.issues
      console.warn(
        `[Intent] reason=zod_invalid raw_intent=${shortRawIntent(parsedJson)} issues=${issues.length} issue_paths=${formatZodIssues(issues)}`
      )
      return { intent: 'smalltalk' }
    }

    const intentData = validationResult.data

    // Sanitize facilitySlugs against DB master facilities
    if (intentData.filters?.facilitySlugs) {
      const validFacilities = await withDbRetry(() =>
        prisma.facility.findMany({ select: { slug: true } })
      )
      const validSlugs = new Set(validFacilities.map((f) => f.slug))
      intentData.filters.facilitySlugs = intentData.filters.facilitySlugs.filter((slug) =>
        validSlugs.has(slug)
      )
      if (intentData.filters.facilitySlugs.length === 0) {
        delete intentData.filters.facilitySlugs
      }
    }

    return intentData
  } catch (err) {
    // Error dari provider LLM (timeout/rate limit/auth/quota/response rusak)
    // diteruskan ke pemanggil agar bisa dipetakan ke pesan & status yang jelas,
    // bukan jatuh diam-diam ke smalltalk.
    if (err instanceof LlmError) {
      throw err
    }
    const errName = err instanceof Error ? err.name : 'unknown'
    const errMessage = err instanceof Error ? err.message.slice(0, 200) : String(err).slice(0, 200)
    console.error(`[Intent] reason=unexpected_error name=${errName} msg=${errMessage}`)
    return { intent: 'smalltalk' }
  }
}
