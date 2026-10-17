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
    throw new Error('LLM is disabled or not configured.')
  }

  const apiKey = process.env.LLM_API_KEY!.trim()
  const baseUrl = (process.env.LLM_BASE_URL || 'https://api.groq.com/openai/v1').replace(/\/+$/, '')
  const model = process.env.LLM_MODEL!.trim()
  const timeoutMs = Number(process.env.LLM_TIMEOUT_MS || 10000)

  const url = `${baseUrl}/chat/completions`

  const startTime = Date.now()
  let status = 0

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.1,
        max_tokens: 300,
        response_format: { type: 'json_object' },
      }),
      signal: AbortSignal.timeout(timeoutMs),
    })

    status = response.status
    const duration = Date.now() - startTime

    // Safe logging: log status, duration, but never keys or message contents
    console.log(`[LLM] status=${status} duration=${duration}ms model=${model}`)

    if (!response.ok) {
      throw new Error(`LLM API error status: ${status}`)
    }

    const data = (await response.json()) as any
    const content = data.choices?.[0]?.message?.content
    if (!content || typeof content !== 'string') {
      throw new Error('Invalid LLM response structure')
    }

    return content
  } catch (err: any) {
    const duration = Date.now() - startTime
    console.error(`[LLM] error status=${status} duration=${duration}ms message=${err.message}`)
    throw err
  }
}
