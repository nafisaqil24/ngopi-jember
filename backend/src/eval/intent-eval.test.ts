import { describe, it, expect } from 'vitest'
import { isDailyLimitMessage, logsIndicateDailyLimit } from './intent-eval.js'

const TPD =
  '[LLM] provider error status=429 duration=120ms model=openai/gpt-oss-20b code=rate_limit_exceeded ' +
  'message=Rate limit reached for model `openai/gpt-oss-20b` in organization `org_x` service tier ' +
  '`on_demand` on tokens per day (TPD): Limit 200000, Used 199999, Requested 1000 kind=rate_limit'

const TPM =
  '[LLM] provider error status=429 duration=100ms model=openai/gpt-oss-20b code=rate_limit_exceeded ' +
  'message=Rate limit reached for model `openai/gpt-oss-20b` in organization `org_x` service tier ' +
  '`on_demand` on tokens per minute (TPM): Limit 8000, Used 7400, Requested 1200 kind=rate_limit'

describe('deteksi limit harian vs per menit pada eval', () => {
  it('mengenali pesan tokens per day (TPD) sebagai limit harian', () => {
    expect(isDailyLimitMessage(TPD)).toBe(true)
    expect(logsIndicateDailyLimit([TPD])).toBe(true)
  })

  it('tidak salah mengenali limit per menit (TPM) sebagai limit harian', () => {
    expect(isDailyLimitMessage(TPM)).toBe(false)
    expect(logsIndicateDailyLimit([TPM])).toBe(false)
  })

  it('mengenali variasi RPD / daily limit', () => {
    expect(isDailyLimitMessage('rate limit on requests per day (RPD): limit reached')).toBe(true)
    expect(isDailyLimitMessage('Daily limit exceeded, try again later')).toBe(true)
  })

  it('mengabaikan log non-provider dan log sukses', () => {
    expect(logsIndicateDailyLimit(['[Intent] reason=json_validate_failed'])).toBe(false)
    expect(logsIndicateDailyLimit(['[LLM] status=200 duration=500ms model=x'])).toBe(false)
    expect(logsIndicateDailyLimit([])).toBe(false)
  })
})