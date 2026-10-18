import { describe, it, expect, vi } from 'vitest'

describe('llm.client - callLlmChat', () => {
  it('logs provider error code and message on non-ok response', async () => {
    vi.resetModules()
    vi.stubEnv('LLM_API_KEY', 'test-key')
    vi.stubEnv('LLM_MODEL', 'test-model')
    const fetchMock = vi.fn()
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({
        error: {
          code: 'rate_limit_exceeded',
          message: 'Rate limit exceeded',
        },
      }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    try {
      const { callLlmChat } = await import('./llm.client.js')
      await callLlmChat([{ role: 'user', content: 'test message' }])
    } catch (e) {
      // Expected to throw
    }

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('provider error status=400')
    )
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('code=rate_limit_exceeded')
    )
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('message=Rate limit exceeded')
    )
    // Should NOT log failed_generation, messages, or user content
    const allCalls = consoleErrorSpy.mock.calls.flat().join(' ')
    expect(allCalls).not.toContain('failed_generation')
    expect(allCalls).not.toContain('test message')
    expect(allCalls).not.toContain('Bearer')
  })

  it('truncates long provider message to 200 chars', async () => {
    vi.resetModules()
    vi.stubEnv('LLM_API_KEY', 'test-key')
    vi.stubEnv('LLM_MODEL', 'test-model')
    const longMessage = 'x'.repeat(300)
    const fetchMock = vi.fn()
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({
        error: {
          code: 'server_error',
          message: longMessage,
        },
      }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    try {
      const { callLlmChat } = await import('./llm.client.js')
      await callLlmChat([{ role: 'user', content: 'test' }])
    } catch (e) {
      // Expected to throw
    }

    const allCalls = consoleErrorSpy.mock.calls.flat().join(' ')
    // Should contain truncated message (200 chars)
    expect(allCalls).toContain('x'.repeat(200))
    // Should NOT contain the full 300 chars
    expect(allCalls).not.toContain('x'.repeat(201))
  })

  it('handles non-JSON error response gracefully', async () => {
    vi.resetModules()
    vi.stubEnv('LLM_API_KEY', 'test-key')
    vi.stubEnv('LLM_MODEL', 'test-model')
    const fetchMock = vi.fn()
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => {
        throw new Error('Not JSON')
      },
    })
    vi.stubGlobal('fetch', fetchMock)

    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    try {
      const { callLlmChat } = await import('./llm.client.js')
      await callLlmChat([{ role: 'user', content: 'test' }])
    } catch (e) {
      // Expected to throw
    }

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('provider error status=500')
    )
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('code=unknown')
    )
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('message=unknown')
    )
  })
})