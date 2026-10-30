import { describe, it, expect, vi, afterEach } from 'vitest'
import { parseUserIntent } from './intent.js'
import * as llmClient from './llm.client.js'
import { prisma } from '../lib/prisma.js'

function prismaError(code: string, message = 'boom') {
  return Object.assign(new Error(message), { code })
}

describe('parseUserIntent — retry query fasilitas', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('mengulang sekali saat P1017 lalu sukses dan hasil tetap normal', async () => {
    vi.spyOn(llmClient, 'isLlmEnabled').mockReturnValue(true)
    vi.spyOn(llmClient, 'callLlmChat').mockResolvedValue(
      JSON.stringify({ intent: 'search_shops', filters: { facilitySlugs: ['wifi'] } })
    )

    const findMany = vi
      .spyOn(prisma.facility, 'findMany')
      // Panggilan #1: buildSystemPrompt (sukses normal).
      .mockResolvedValueOnce([{ slug: 'wifi' }] as any)
      // Panggilan #2: sanitasi fasilitas -> error transien.
      .mockRejectedValueOnce(prismaError('P1017'))
      // Panggilan #3: retry sanitasi -> sukses.
      .mockResolvedValueOnce([{ slug: 'wifi' }] as any)

    const result = await parseUserIntent('cari kafe yang ada wifi')

    expect(result.intent).toBe('search_shops')
    expect(result.filters?.facilitySlugs).toEqual(['wifi'])
    // #1 buildSystemPrompt + #2 percobaan pertama + #3 retry.
    expect(findMany).toHaveBeenCalledTimes(3)
  })

  it('tidak mengulang error non-transien', async () => {
    vi.spyOn(llmClient, 'isLlmEnabled').mockReturnValue(true)
    vi.spyOn(llmClient, 'callLlmChat').mockResolvedValue(
      JSON.stringify({ intent: 'search_shops', filters: { facilitySlugs: ['wifi'] } })
    )
    vi.spyOn(console, 'error').mockImplementation(() => {})

    const findMany = vi
      .spyOn(prisma.facility, 'findMany')
      .mockResolvedValueOnce([{ slug: 'wifi' }] as any)
      .mockRejectedValueOnce(prismaError('P2002'))

    const result = await parseUserIntent('cari kafe yang ada wifi')

    // Error non-transien tetap jatuh ke smalltalk (perilaku lama) dan hanya
    // dicoba sekali pada query sanitasi.
    expect(result.intent).toBe('smalltalk')
    expect(findMany).toHaveBeenCalledTimes(2)
  })
})