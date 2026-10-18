import { buildSystemPrompt } from './prompts.js'
import { callLlmChat, isLlmEnabled, ChatMessage } from './llm.client.js'
import { parsedIntentSchema, ParsedIntent } from './schema.js'
import { prisma } from '../lib/prisma.js'

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
      if (jsonMatch) {
        parsedJson = JSON.parse(jsonMatch[0])
      } else {
        throw new Error('Failed to parse JSON from LLM response')
      }
    }

    // Validate with Zod
    const normalizedJson = stripNullKeys(parsedJson)
    const validationResult = parsedIntentSchema.safeParse(normalizedJson)
    if (!validationResult.success) {
      return { intent: 'smalltalk' }
    }

    const intentData = validationResult.data

    // Sanitize facilitySlugs against DB master facilities
    if (intentData.filters?.facilitySlugs) {
      const validFacilities = await prisma.facility.findMany({ select: { slug: true } })
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
    console.error('[Intent] Error parsing intent, falling back to smalltalk:', err)
    return { intent: 'smalltalk' }
  }
}
