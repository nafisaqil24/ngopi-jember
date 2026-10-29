import { describe, it, expect } from 'vitest'
import { LlmError, classifyHttpStatus, classifyException, LLM_ERROR_META } from './llm.errors.js'
import type { LlmErrorKind } from './llm.errors.js'

describe('llm.errors - klasifikasi error provider', () => {
  it('mengklasifikasikan status HTTP provider', () => {
    expect(classifyHttpStatus(401)).toBe('auth')
    expect(classifyHttpStatus(403)).toBe('auth')
    expect(classifyHttpStatus(429)).toBe('rate_limit')
    expect(classifyHttpStatus(402)).toBe('quota')
    expect(classifyHttpStatus(500)).toBe('unknown')
    expect(classifyHttpStatus(400)).toBe('unknown')
  })

  it('mengklasifikasikan berdasarkan provider code', () => {
    expect(classifyHttpStatus(400, 'rate_limit_exceeded')).toBe('rate_limit')
    expect(classifyHttpStatus(400, 'insufficient_quota')).toBe('quota')
    expect(classifyHttpStatus(400, 'billing_hard_limit_reached')).toBe('quota')
    expect(classifyHttpStatus(400, 'invalid_api_key')).toBe('auth')
    expect(classifyHttpStatus(400, 'something_else')).toBe('unknown')
  })

  it('mengklasifikasikan exception timeout/abort', () => {
    expect(classifyException({ name: 'TimeoutError' })).toBe('timeout')
    expect(classifyException({ name: 'AbortError' })).toBe('timeout')
    expect(classifyException(new Error('network down'))).toBe('unknown')
  })

  it('LlmError membawa httpStatus dan userMessage sesuai kind', () => {
    const kinds = Object.keys(LLM_ERROR_META) as LlmErrorKind[]
    for (const kind of kinds) {
      const err = new LlmError(kind)
      expect(err).toBeInstanceOf(Error)
      expect(err.name).toBe('LlmError')
      expect(err.kind).toBe(kind)
      expect(err.httpStatus).toBe(LLM_ERROR_META[kind].httpStatus)
      expect(err.userMessage).toBe(LLM_ERROR_META[kind].userMessage)
    }
  })

  it('semua status HTTP adalah 5xx dan pesan tidak sensitif', () => {
    const kinds = Object.keys(LLM_ERROR_META) as LlmErrorKind[]
    for (const kind of kinds) {
      const meta = LLM_ERROR_META[kind]
      expect(meta.httpStatus).toBeGreaterThanOrEqual(500)
      expect(meta.userMessage).not.toMatch(/key|token|bearer|stack/i)
    }
  })
})
