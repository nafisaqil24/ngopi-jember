import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import { app } from '../app.js'
import * as llmClient from './llm.client.js'
import { CHAT_RESTING_REPLY } from './templates.js'

// Izinkan isolasi rate limiter per-test lewat header X-Forwarded-For.
// Hanya memengaruhi instance app di dalam file test ini, bukan kode produksi.
app.set('trust proxy', 1)

describe('Chat API (/api/chat)', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('rejects empty or too long messages', async () => {
    const resLong = await request(app)
      .post('/api/chat')
      .send({ message: 'a'.repeat(301) })
    expect(resLong.status).toBe(400)
  })

  it('rejects location outside Jember', async () => {
    const resOutside = await request(app)
      .post('/api/chat')
      .send({ message: 'cari kafe', location: { lat: -6.2, lng: 106.8 } })
    expect(resOutside.status).toBe(400)
    expect(resOutside.body.message).toContain('di luar wilayah Jember')
  })

  it('replies with fallback when LLM is disabled', async () => {
    vi.spyOn(llmClient, 'isLlmEnabled').mockReturnValue(false)
    const callSpy = vi.spyOn(llmClient, 'callLlmChat')
    const res = await request(app)
      .post('/api/chat')
      .set('X-Forwarded-For', '198.51.100.10')
      .send({ message: 'halo' })
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data.reply).toBe(CHAT_RESTING_REPLY)
    expect(res.body.data.reply).not.toContain('LLM')
    expect(res.body.data.reply).not.toContain('kuota')
    expect(callSpy).not.toHaveBeenCalled()
  })

  it('handles search intent with mocked LLM and does not expose sensitive fields', async () => {
    vi.spyOn(llmClient, 'isLlmEnabled').mockReturnValue(true)
    vi.spyOn(llmClient, 'callLlmChat').mockResolvedValue(
      JSON.stringify({
        intent: 'search_shops',
        filters: { district: 'Sumbersari' },
      })
    )

    const res = await request(app)
      .post('/api/chat')
      .send({ message: 'cari kedai di Sumbersari' })

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data).toHaveProperty('reply')

    // Ensure no sensitive fields like ownerId or subscription in shops
    if (res.body.data.shops && res.body.data.shops.length > 0) {
      const shop = res.body.data.shops[0]
      expect(shop).not.toHaveProperty('ownerId')
      expect(shop).not.toHaveProperty('subscription')
    }
  })

  it('rejects JSON body larger than 4kb with 413 and no stack trace', async () => {
    const res = await request(app)
      .post('/api/chat')
      .send({ message: 'a'.repeat(5000) })

    expect(res.status).toBe(413)
    expect(res.body.success).toBe(false)
    expect(res.body).not.toHaveProperty('stack')
    expect(JSON.stringify(res.body)).not.toContain('at ')
  })

  it('accepts a reasonably sized valid body without 413', async () => {
    vi.spyOn(llmClient, 'isLlmEnabled').mockReturnValue(false)
    const res = await request(app)
      .post('/api/chat')
      .send({
        message: 'a'.repeat(300),
        location: { lat: -8.17, lng: 113.7 },
        history: Array.from({ length: 4 }, () => ({ role: 'user', content: 'b'.repeat(300) })),
      })

    expect(res.status).not.toBe(413)
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
  })

  it('rate limits per IP after 5 requests per minute with 429 and standard headers', async () => {
    vi.spyOn(llmClient, 'isLlmEnabled').mockReturnValue(false)
    const ip = '203.0.113.50'

    const responses = []
    for (let i = 0; i < 6; i++) {
      responses.push(
        await request(app)
          .post('/api/chat')
          .set('X-Forwarded-For', ip)
          .send({ message: 'halo' })
      )
    }

    // 5 request pertama lolos (LLM mati -> 200 "istirahat"), ke-6 kena limit.
    for (let i = 0; i < 5; i++) {
      expect(responses[i].status).toBe(200)
      expect(responses[i].headers['ratelimit-limit']).toBeDefined()
      expect(responses[i].headers['ratelimit-remaining']).toBeDefined()
    }

    const blocked = responses[5]
    expect(blocked.status).toBe(429)
    expect(blocked.body.success).toBe(false)
    expect(typeof blocked.body.message).toBe('string')
    expect(blocked.headers['ratelimit-limit']).toBeDefined()
    expect(blocked.headers['retry-after']).toBeDefined()
  })

  it('enforces daily limit and only counts when the LLM is actually called', async () => {
    vi.resetModules()
    const prevLimit = process.env.CHAT_DAILY_LIMIT
    process.env.CHAT_DAILY_LIMIT = '2'
    try {
      const freshApp = (await import('../app.js')).app
      const freshLlm = await import('./llm.client.js')

      const enabledSpy = vi.spyOn(freshLlm, 'isLlmEnabled')
      enabledSpy.mockReturnValueOnce(false) // request #1: LLM mati, tidak memakai kuota
      enabledSpy.mockReturnValue(true) // sisanya: LLM aktif

      const callSpy = vi
        .spyOn(freshLlm, 'callLlmChat')
        .mockResolvedValue(JSON.stringify({ intent: 'smalltalk' }))

      const post = () =>
        request(freshApp)
          .post('/api/chat')
          .set('X-Forwarded-For', '198.51.100.31')
          .send({ message: 'halo' })

      const r1 = await post() // LLM mati -> tidak makan kuota
      const r2 = await post() // LLM dipanggil (kuota 1)
      const r3 = await post() // LLM dipanggil (kuota 2)
      const r4 = await post() // kuota habis

      expect(r1.status).toBe(200)
      expect(r1.body.success).toBe(true)
      expect(r1.body.data.reply).toBe(CHAT_RESTING_REPLY)

      expect(r2.status).toBe(200)
      expect(r3.status).toBe(200)
      expect(callSpy).toHaveBeenCalledTimes(2)

      expect(r4.status).toBe(200)
      expect(r4.body.success).toBe(true)
      expect(r4.body.data.reply).toBe(CHAT_RESTING_REPLY)
      // Kedua kondisi (LLM mati & kuota habis) memakai reply yang sama persis.
      expect(r4.body.data.reply).toBe(r1.body.data.reply)
      expect(r4.body.data.reply).not.toContain('LLM')
      expect(r4.body.data.reply).not.toContain('kuota')
      // LLM tetap tidak dipanggil saat kuota habis.
      expect(callSpy).toHaveBeenCalledTimes(2)
    } finally {
      if (prevLimit === undefined) {
        delete process.env.CHAT_DAILY_LIMIT
      } else {
        process.env.CHAT_DAILY_LIMIT = prevLimit
      }
    }
  })

  it('does not leak ownerId, subscription, or email in shop responses', async () => {
    vi.spyOn(llmClient, 'isLlmEnabled').mockReturnValue(true)
    vi.spyOn(llmClient, 'callLlmChat').mockResolvedValue(
      JSON.stringify({ intent: 'search_shops', filters: {} })
    )

    const res = await request(app)
      .post('/api/chat')
      .set('X-Forwarded-For', '198.51.100.77')
      .send({ message: 'rekomendasi kedai kopi' })

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data).toHaveProperty('reply')

    const shops = res.body.data.shops
    expect(Array.isArray(shops)).toBe(true)
    expect(shops.length).toBeGreaterThan(0)

    const forbiddenKeys = ['ownerId', 'owner', 'subscription', 'email']
    for (const shop of shops) {
      for (const key of forbiddenKeys) {
        expect(Object.keys(shop)).not.toContain(key)
      }
    }

    const serialized = JSON.stringify(res.body)
    expect(serialized).not.toContain('ownerId')
    expect(serialized).not.toContain('subscription')
    expect(serialized).not.toContain('email')
  })
})
