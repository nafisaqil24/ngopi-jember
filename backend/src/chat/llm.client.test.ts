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

  async function callAndCapture(): Promise<any> {
    let thrown: any
    try {
      const { callLlmChat } = await import('./llm.client.js')
      await callLlmChat([{ role: 'user', content: 'rahasia user' }])
    } catch (e) {
      thrown = e
    }
    return thrown
  }

  function stubOkJson(json: unknown, status = 200) {
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: status >= 200 && status < 300,
      status,
      json: async () => json,
    })
    vi.stubGlobal('fetch', fetchMock)
  }

  it('melempar LlmError kind=timeout saat fetch timeout/abort', async () => {
    vi.resetModules()
    vi.stubEnv('LLM_API_KEY', 'test-key')
    vi.stubEnv('LLM_MODEL', 'test-model')
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(
        Object.assign(new Error('The operation was aborted'), { name: 'TimeoutError' })
      )
    vi.stubGlobal('fetch', fetchMock)
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const err = await callAndCapture()

    expect(err?.kind).toBe('timeout')
    expect(err?.httpStatus).toBe(504)
    const allCalls = consoleErrorSpy.mock.calls.flat().join(' ')
    expect(allCalls).toContain('kind=timeout')
    expect(allCalls).not.toContain('Bearer')
    expect(allCalls).not.toContain('test-key')
    expect(allCalls).not.toContain('rahasia user')
  })

  it('melempar LlmError kind=rate_limit saat provider membalas rate limit', async () => {
    vi.resetModules()
    vi.stubEnv('LLM_API_KEY', 'test-key')
    vi.stubEnv('LLM_MODEL', 'test-model')
    stubOkJson({ error: { code: 'rate_limit_exceeded', message: 'slow down' } }, 429)
    vi.spyOn(console, 'error').mockImplementation(() => {})

    const err = await callAndCapture()

    expect(err?.kind).toBe('rate_limit')
    expect(err?.httpStatus).toBe(503)
  })

  it('melempar LlmError kind=auth saat provider membalas 401', async () => {
    vi.resetModules()
    vi.stubEnv('LLM_API_KEY', 'test-key')
    vi.stubEnv('LLM_MODEL', 'test-model')
    stubOkJson({ error: { code: 'invalid_api_key', message: 'bad key' } }, 401)
    vi.spyOn(console, 'error').mockImplementation(() => {})

    const err = await callAndCapture()

    expect(err?.kind).toBe('auth')
    expect(err?.httpStatus).toBe(503)
  })

  it('melempar LlmError kind=quota saat kuota provider habis', async () => {
    vi.resetModules()
    vi.stubEnv('LLM_API_KEY', 'test-key')
    vi.stubEnv('LLM_MODEL', 'test-model')
    stubOkJson({ error: { code: 'insufficient_quota', message: 'quota habis' } }, 402)
    vi.spyOn(console, 'error').mockImplementation(() => {})

    const err = await callAndCapture()

    expect(err?.kind).toBe('quota')
    expect(err?.httpStatus).toBe(503)
  })

  it('melempar LlmError kind=invalid_response saat konten kosong', async () => {
    vi.resetModules()
    vi.stubEnv('LLM_API_KEY', 'test-key')
    vi.stubEnv('LLM_MODEL', 'test-model')
    stubOkJson({ choices: [] }, 200)
    vi.spyOn(console, 'error').mockImplementation(() => {})

    const err = await callAndCapture()

    expect(err?.kind).toBe('invalid_response')
    expect(err?.httpStatus).toBe(502)
  })

  it('melempar LlmError kind=unknown saat provider membalas 500', async () => {
    vi.resetModules()
    vi.stubEnv('LLM_API_KEY', 'test-key')
    vi.stubEnv('LLM_MODEL', 'test-model')
    stubOkJson({ error: { code: 'server_error', message: 'oops' } }, 500)
    vi.spyOn(console, 'error').mockImplementation(() => {})

    const err = await callAndCapture()

    expect(err?.kind).toBe('unknown')
    expect(err?.httpStatus).toBe(502)
  })
})