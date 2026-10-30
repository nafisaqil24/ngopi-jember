import { describe, it, expect, vi, afterEach } from 'vitest'
import { parseUserIntent } from './intent.js'
import * as llmClient from './llm.client.js'

describe('parseUserIntent — log fallback smalltalk', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('mencatat reason=zod_invalid untuk key asing, hasil tetap smalltalk', async () => {
    vi.spyOn(llmClient, 'isLlmEnabled').mockReturnValue(true)
    vi.spyOn(llmClient, 'callLlmChat').mockResolvedValue(
      JSON.stringify({
        intent: 'search_shops',
        filters: { district: 'Sumbersari' },
        ownerId: 'rahasia-internal',
      })
    )
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const result = await parseUserIntent('RAHASIA_PESAN_PENGGUNA cari kafe')

    expect(result.intent).toBe('smalltalk')
    expect(warnSpy).toHaveBeenCalledTimes(1)
    const line = String(warnSpy.mock.calls[0][0])
    expect(line).toContain('[Intent]')
    expect(line).toContain('reason=zod_invalid')
    expect(line).toContain('raw_intent=search_shops')
    expect(line).toContain('unrecognized_keys')
    expect(line).not.toContain('RAHASIA_PESAN_PENGGUNA')
    expect(line).not.toContain('rahasia-internal')
  })

  it('mencatat reason=zod_invalid beserta path dan code issue untuk tipe salah', async () => {
    vi.spyOn(llmClient, 'isLlmEnabled').mockReturnValue(true)
    vi.spyOn(llmClient, 'callLlmChat').mockResolvedValue(
      JSON.stringify({
        intent: 'search_shops',
        filters: { maxPrice: 'murah sekali' },
      })
    )
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const result = await parseUserIntent('cari yang murah')

    expect(result.intent).toBe('smalltalk')
    const line = String(warnSpy.mock.calls[0][0])
    expect(line).toContain('reason=zod_invalid')
    expect(line).toContain('raw_intent=search_shops')
    expect(line).toContain('filters.maxPrice:invalid_type')
  })

  it('raw_intent menjadi unknown bila intent tidak dikenal', async () => {
    vi.spyOn(llmClient, 'isLlmEnabled').mockReturnValue(true)
    vi.spyOn(llmClient, 'callLlmChat').mockResolvedValue(
      JSON.stringify({ intent: 'intent_palsu_yang_tidak_ada' })
    )
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    await parseUserIntent('halo')

    const line = String(warnSpy.mock.calls[0][0])
    expect(line).toContain('reason=zod_invalid')
    expect(line).toContain('raw_intent=unknown')
  })

  it('mencatat reason=llm_disabled saat LLM nonaktif', async () => {
    vi.spyOn(llmClient, 'isLlmEnabled').mockReturnValue(false)
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const result = await parseUserIntent('halo')

    expect(result.intent).toBe('smalltalk')
    expect(String(warnSpy.mock.calls[0][0])).toContain('reason=llm_disabled')
  })

  it('mencatat reason=unexpected_error dan tidak membocorkan isi pesan pengguna', async () => {
    vi.spyOn(llmClient, 'isLlmEnabled').mockReturnValue(true)
    vi.spyOn(llmClient, 'callLlmChat').mockRejectedValue(new Error('koneksi putus'))
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const result = await parseUserIntent('PESAN_RAHASIA_PENGGUNA')

    expect(result.intent).toBe('smalltalk')
    const line = String(errorSpy.mock.calls[0][0])
    expect(line).toContain('reason=unexpected_error')
    expect(line).not.toContain('PESAN_RAHASIA_PENGGUNA')
  })
})