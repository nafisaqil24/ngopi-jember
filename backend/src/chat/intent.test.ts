import { describe, it, expect, vi, beforeEach } from 'vitest'
import { parsedIntentSchema } from './schema.js'
import { parseUserIntent } from './intent.js'
import * as llmClient from './llm.client.js'

describe('Intent Schema & Parser', () => {
  it('validates correct intent structure with Zod', () => {
    const valid = {
      intent: 'search_shops',
      filters: {
        district: 'Sumbersari',
        maxPrice: 30000,
        openNow: true,
      },
    }
    const res = parsedIntentSchema.safeParse(valid)
    expect(res.success).toBe(true)
  })

  it('rejects unknown dangerous fields (like ownerId or SQL) due to strict schema', () => {
    const malicious = {
      intent: 'search_shops',
      filters: {
        district: 'Sumbersari',
        ownerId: 'secret-id',
        sql: 'DROP TABLE CoffeeShop;',
      },
    }
    const res = parsedIntentSchema.safeParse(malicious)
    expect(res.success).toBe(false)
  })

  it('fails strict schema when unknown keys are present', () => {
    const malicious = {
      intent: 'search_shops',
      filters: {
        district: 'Sumbersari',
        ownerId: 'secret-id',
      },
    }
    const res = parsedIntentSchema.safeParse(malicious)
    expect(res.success).toBe(false)
  })

  it('falls back to smalltalk when LLM is disabled', async () => {
    vi.spyOn(llmClient, 'isLlmEnabled').mockReturnValue(false)
    const result = await parseUserIntent('cari kedai')
    expect(result.intent).toBe('smalltalk')
  })
})
