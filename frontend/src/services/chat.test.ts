import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { ApiError } from './coffeeShop'
import { buildChatHistory, sendChatMessage } from './chat'

const fetchMock = vi.fn()

function mockFetchOnce(status: number, body: unknown) {
  fetchMock.mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  })
}

describe('services/chat - sendChatMessage', () => {
  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('mengirim message ter-trim, location, dan history terbatas', async () => {
    mockFetchOnce(200, { success: true, data: { reply: 'Halo juga' } })

    const result = await sendChatMessage({
      message: '  hai  ',
      location: { lat: -8.17, lng: 113.7 },
      history: [
        { role: 'user', content: '   ' },
        { role: 'assistant', content: 'a'.repeat(400) },
        { role: 'user', content: 'b' },
        { role: 'assistant', content: 'c' },
        { role: 'user', content: 'd' },
        { role: 'assistant', content: 'e' },
      ],
    })

    expect(result.reply).toBe('Halo juga')
    expect(fetchMock).toHaveBeenCalledTimes(1)

    const [url, options] = fetchMock.mock.calls[0]
    expect(String(url)).toContain('/chat')
    expect(options.method).toBe('POST')

    const body = JSON.parse(options.body)
    expect(body.message).toBe('hai')
    expect(body.location).toEqual({ lat: -8.17, lng: 113.7 })
    expect(body.history).toHaveLength(4)
    expect(body.history.every((item: { content: string }) => item.content.length > 0)).toBe(true)
    expect(body.history.every((item: { content: string }) => item.content.length <= 300)).toBe(true)
  })

  it('tidak mengirim history/location bila kosong', async () => {
    mockFetchOnce(200, { success: true, data: { reply: 'ok' } })

    await sendChatMessage({ message: 'halo' })

    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(body).toEqual({ message: 'halo' })
  })

  it('menolak pesan kosong tanpa memanggil fetch', async () => {
    await expect(sendChatMessage({ message: '   ' })).rejects.toBeInstanceOf(ApiError)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('menolak pesan lebih dari 300 karakter tanpa memanggil fetch', async () => {
    await expect(sendChatMessage({ message: 'a'.repeat(301) })).rejects.toThrow(/300/)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('memakai message backend untuk error 400', async () => {
    mockFetchOnce(400, { success: false, message: 'Format pesan tidak valid' })
    await expect(sendChatMessage({ message: 'halo' })).rejects.toThrow('Format pesan tidak valid')
  })

  it('memakai pesan ramah untuk error 413', async () => {
    mockFetchOnce(413, { success: false, message: 'request entity too large' })
    await expect(sendChatMessage({ message: 'halo' })).rejects.toThrow('Pesanmu terlalu panjang')
  })

  it('memakai pesan ramah untuk error 429', async () => {
    mockFetchOnce(429, { success: false, message: 'rate limited' })
    await expect(sendChatMessage({ message: 'halo' })).rejects.toThrow(
      'Terlalu banyak pesan, tunggu sebentar ya'
    )
  })

  it('memakai pesan ramah saat gagal jaringan', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    await expect(sendChatMessage({ message: 'halo' })).rejects.toThrow('Koneksi bermasalah, coba lagi ya')
  })
})

describe('services/chat - buildChatHistory', () => {
  it('mengembalikan array kosong bila tidak ada history', () => {
    expect(buildChatHistory()).toEqual([])
  })

  it('membuang content kosong dan hanya menyisakan 4 pesan terakhir', () => {
    const result = buildChatHistory([
      { role: 'user', content: 'satu' },
      { role: 'assistant', content: 'dua' },
      { role: 'user', content: '   ' },
      { role: 'assistant', content: 'tiga' },
      { role: 'user', content: 'empat' },
      { role: 'assistant', content: 'lima' },
    ])
    expect(result).toHaveLength(4)
    expect(result.map((item) => item.content)).toEqual(['dua', 'tiga', 'empat', 'lima'])
  })
})