import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { parsedIntentSchema } from './schema.js'
import { parseUserIntent } from './intent.js'
import * as llmClient from './llm.client.js'

describe('Intent Schema & Parser', () => {
  beforeEach(() => {
    vi.spyOn(llmClient, 'isLlmEnabled').mockReturnValue(true)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

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

  it('membuang key null dari model sehingga intent search_shops tidak jatuh ke smalltalk', async () => {
    vi.spyOn(llmClient, 'callLlmChat').mockResolvedValue(
      JSON.stringify({
        intent: 'search_shops',
        filters: { district: 'Sumbersari', openNow: true },
        shopQuery: null,
        faqTopic: null,
      })
    )
    const result = await parseUserIntent('kedai buka sekarang di Sumbersari')
    expect(result.intent).toBe('search_shops')
    expect(result.filters?.district).toBe('Sumbersari')
    expect(result.filters?.openNow).toBe(true)
  })

  it('membuang key null secara rekursif di dalam filters', async () => {
    vi.spyOn(llmClient, 'callLlmChat').mockResolvedValue(
      JSON.stringify({
        intent: 'search_shops',
        filters: { district: 'Sumbersari', maxPrice: null, facilitySlugs: null, openNow: true },
        shopQuery: null,
      })
    )
    const result = await parseUserIntent('kedai murah ada wifi')
    expect(result.intent).toBe('search_shops')
    expect(result.filters).toEqual({ district: 'Sumbersari', openNow: true })
  })

  it('tetap menolak key tak dikenal (skema strict) walau ada null', async () => {
    vi.spyOn(llmClient, 'callLlmChat').mockResolvedValue(
      JSON.stringify({
        intent: 'search_shops',
        filters: { district: 'Sumbersari', ownerId: 'secret-id' },
        shopQuery: null,
      })
    )
    const result = await parseUserIntent('cari kedai')
    expect(result.intent).toBe('smalltalk')
  })
})
