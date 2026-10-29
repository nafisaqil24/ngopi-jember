import { LlmError, classifyHttpStatus, classifyException } from './llm.errors.js'

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export function isLlmEnabled(): boolean {
  const apiKey = process.env.LLM_API_KEY
  const model = process.env.LLM_MODEL
  return Boolean(apiKey && apiKey.trim() !== '' && model && model.trim() !== '')
}

export async function callLlmChat(messages: ChatMessage[]): Promise<string> {
  if (!isLlmEnabled()) {
    throw new LlmError('unknown')
  }

  const apiKey = process.env.LLM_API_KEY!.trim()
  const baseUrl = (process.env.LLM_BASE_URL || 'https://api.groq.com/openai/v1').replace(/\/+$/, '')
  const model = process.env.LLM_MODEL!.trim()
  const timeoutMs = Number(process.env.LLM_TIMEOUT_MS || 10000)

  const url = `${baseUrl}/chat/completions`

  const startTime = Date.now()
  let status = 0

  let response: Response
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.1,
        max_tokens: 1024,
        response_format: { type: 'json_object' },
        reasoning_effort: 'low',
      }),
      signal: AbortSignal.timeout(timeoutMs),
    })
  } catch (err) {
    const kind = classifyException(err)
    const duration = Date.now() - startTime
    const message = err instanceof Error ? err.message.slice(0, 200) : 'unknown'
    // Log aman: jenis error + status/duration/model + pesan ringkas. Tidak ada
    // header, API key, isi pesan pengguna, atau body mentah.
    console.error(`[LLM] error status=${status} duration=${duration}ms model=${model} kind=${kind} message=${message}`)
    throw new LlmError(kind)
  }

  status = response.status
  const duration = Date.now() - startTime

  // Safe logging: log status, duration, but never keys or message contents
  console.log(`[LLM] status=${status} duration=${duration}ms model=${model}`)

  if (!response.ok) {
    // Log ringkas error provider: hanya code + message (dipotong), plus
    // status/duration/model. TIDAK PERNAH log failed_generation, messages,
    // isi pesan pengguna, header, atau API key.
    let providerCode = 'unknown'
    let providerMessage = 'unknown'
    try {
      const errBody = (await response.json()) as {
        error?: { code?: unknown; message?: unknown }
      }
      if (typeof errBody?.error?.code === 'string') providerCode = errBody.error.code
      if (typeof errBody?.error?.message === 'string') {
        providerMessage = errBody.error.message.slice(0, 200)
      }
    } catch {
      // Body error bisa bukan JSON; abaikan.
    }
    const kind = classifyHttpStatus(status, providerCode)
    const errorDuration = Date.now() - startTime
    console.error(
      `[LLM] provider error status=${status} duration=${errorDuration}ms model=${model} code=${providerCode} message=${providerMessage} kind=${kind}`
    )
    throw new LlmError(kind, { providerStatus: status, providerCode })
  }

  let data: any
  try {
    data = await response.json()
  } catch {
    const errorDuration = Date.now() - startTime
    console.error(
      `[LLM] invalid response status=${status} duration=${errorDuration}ms model=${model} kind=invalid_response reason=json_parse_failed`
    )
    throw new LlmError('invalid_response', { providerStatus: status })
  }

  const content = data?.choices?.[0]?.message?.content
  if (!content || typeof content !== 'string') {
    const errorDuration = Date.now() - startTime
    console.error(
      `[LLM] invalid response status=${status} duration=${errorDuration}ms model=${model} kind=invalid_response reason=missing_content`
    )
    throw new LlmError('invalid_response', { providerStatus: status })
  }

  return content
}
