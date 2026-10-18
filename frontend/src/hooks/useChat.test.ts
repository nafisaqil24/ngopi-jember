import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { ApiError } from '../services/coffeeShop'
import * as chatService from '../services/chat'
import { useChat } from './useChat'

vi.mock('../services/chat', async (importOriginal) => {
  const actual = await importOriginal<typeof chatService>()
  return { ...actual, sendChatMessage: vi.fn() }
})

const sendMock = vi.mocked(chatService.sendChatMessage)

function setGeolocation(geo: unknown) {
  Object.defineProperty(navigator, 'geolocation', { value: geo, configurable: true, writable: true })
}

function geoSuccess(lat: number, lng: number) {
  return vi.fn((success: PositionCallback) => {
    success({ coords: { latitude: lat, longitude: lng } } as GeolocationPosition)
  })
}

describe('hooks/useChat', () => {
  beforeEach(() => {
    sendMock.mockReset()
  })

  it('alur sukses menambah pesan user dan assistant', async () => {
    sendMock.mockResolvedValue({ reply: 'Halo juga' })

    const { result } = renderHook(() => useChat())

    await act(async () => {
      await result.current.send('hai')
    })

    expect(sendMock).toHaveBeenCalledTimes(1)
    expect(result.current.messages).toHaveLength(2)
    expect(result.current.messages[0]).toMatchObject({ role: 'user', content: 'hai' })
    expect(result.current.messages[1]).toMatchObject({ role: 'assistant', content: 'Halo juga' })
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBe('')
  })

  it('menyimpan shops pada pesan assistant terkait', async () => {
    const shop = {
      slug: 'kopi-jember',
      name: 'Kopi Jember',
      district: 'Sumbersari',
      address: 'Jl. Test',
      priceRange: 'Rp15.000',
      openingHours: '08:00 - 22:00',
      latitude: -8.17,
      longitude: 113.7,
      description: 'Enak',
      categories: [],
      facilities: ['wifi'],
      rating: 4.5,
      reviewCount: 3,
      image: null,
    }
    sendMock.mockResolvedValue({ reply: 'Ini rekomendasinya', shops: [shop] })

    const { result } = renderHook(() => useChat())

    await act(async () => {
      await result.current.send('cari kafe')
    })

    expect(result.current.messages[1].shops).toHaveLength(1)
    expect(result.current.messages[1].shops?.[0].slug).toBe('kopi-jember')
  })

  it('menyimpan error dari ApiError', async () => {
    sendMock.mockRejectedValue(new ApiError('Koneksi bermasalah, coba lagi ya'))

    const { result } = renderHook(() => useChat())

    await act(async () => {
      await result.current.send('hai')
    })

    expect(result.current.error).toBe('Koneksi bermasalah, coba lagi ya')
    expect(result.current.messages.filter((m) => m.role === 'assistant')).toHaveLength(0)
    expect(result.current.loading).toBe(false)
  })

  it('menandai needsLocation dan menyimpan pesan yang menunggu lokasi', async () => {
    sendMock.mockResolvedValue({ reply: 'Aktifkan lokasi ya', needsLocation: true })

    const { result } = renderHook(() => useChat())

    await act(async () => {
      await result.current.send('dekat sini')
    })

    expect(result.current.needsLocation).toBe(true)
    expect(result.current.pendingMessage).toBe('dekat sini')
  })

  it('tidak mengirim ganda saat masih loading', async () => {
    let resolveSend: (value: { reply: string }) => void = () => {}
    sendMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveSend = resolve
        })
    )

    const { result } = renderHook(() => useChat())

    act(() => {
      void result.current.send('pertama')
      void result.current.send('kedua')
    })

    expect(sendMock).toHaveBeenCalledTimes(1)

    await act(async () => {
      resolveSend({ reply: 'ok' })
    })

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(sendMock).toHaveBeenCalledTimes(1)
    expect(result.current.messages).toHaveLength(2)
  })

  it('clear mengosongkan seluruh state', async () => {
    sendMock.mockResolvedValue({ reply: 'Halo' })

    const { result } = renderHook(() => useChat())

    await act(async () => {
      await result.current.send('hai')
    })
    expect(result.current.messages).toHaveLength(2)

    act(() => {
      result.current.clear()
    })

    expect(result.current.messages).toHaveLength(0)
    expect(result.current.error).toBe('')
    expect(result.current.needsLocation).toBe(false)
    expect(result.current.pendingMessage).toBeNull()
  })

  it('history tidak memuat pesan yang sedang dikirim (anti duplikasi)', async () => {
    sendMock.mockResolvedValueOnce({ reply: 'balasan satu' })
    sendMock.mockResolvedValueOnce({ reply: 'balasan dua' })

    const { result } = renderHook(() => useChat())

    await act(async () => {
      await result.current.send('pesan-pertama')
    })
    await act(async () => {
      await result.current.send('pesan-kedua')
    })

    expect(sendMock).toHaveBeenCalledTimes(2)
    const secondCallArg = sendMock.mock.calls[1][0]
    expect(secondCallArg.message).toBe('pesan-kedua')

    const historyContents = (secondCallArg.history ?? []).map((item) => item.content)
    // Pesan yang sedang dikirim tidak ikut masuk history.
    expect(historyContents).not.toContain('pesan-kedua')
    // Pesan sebelumnya (dan balasannya) tetap ada.
    expect(historyContents).toContain('pesan-pertama')
    expect(historyContents).toContain('balasan satu')
  })
})

describe('hooks/useChat - lokasi (F3)', () => {
  beforeEach(() => {
    sendMock.mockReset()
    Object.defineProperty(window, 'isSecureContext', { value: true, configurable: true })
  })

  afterEach(() => {
    setGeolocation(undefined)
    vi.restoreAllMocks()
  })

  it('tidak memanggil geolocation sebelum klik, lalu resend tanpa duplikasi + simpan lokasi', async () => {
    const getCurrentPosition = geoSuccess(-8.172345, 113.700812)
    setGeolocation({ getCurrentPosition })

    sendMock.mockResolvedValueOnce({ reply: 'butuh lokasi', needsLocation: true })
    sendMock.mockResolvedValueOnce({ reply: 'ini kedai terdekat' })

    const { result } = renderHook(() => useChat())

    await act(async () => {
      await result.current.send('dekat sini')
    })

    expect(result.current.needsLocation).toBe(true)
    expect(result.current.pendingMessage).toBe('dekat sini')
    // Belum diklik -> geolocation tidak boleh terpanggil.
    expect(getCurrentPosition).not.toHaveBeenCalled()

    await act(async () => {
      await result.current.requestLocation()
    })

    expect(getCurrentPosition).toHaveBeenCalledTimes(1)
    expect(sendMock).toHaveBeenCalledTimes(2)
    const resendArg = sendMock.mock.calls[1][0]
    expect(resendArg.message).toBe('dekat sini')
    expect(resendArg.location).toEqual({ lat: -8.172, lng: 113.701 })

    // Pesan user tidak dobel di daftar.
    expect(result.current.messages.filter((m) => m.role === 'user')).toHaveLength(1)
    expect(result.current.needsLocation).toBe(false)
    expect(result.current.locationStatus).toBe('granted')
  })

  it('pertanyaan berikutnya membawa lokasi tersimpan tanpa minta izin lagi', async () => {
    setGeolocation({ getCurrentPosition: geoSuccess(-8.1, 113.7) })

    sendMock.mockResolvedValueOnce({ reply: 'butuh lokasi', needsLocation: true })
    sendMock.mockResolvedValueOnce({ reply: 'ini kedai' })
    sendMock.mockResolvedValueOnce({ reply: 'oke' })

    const { result } = renderHook(() => useChat())

    await act(async () => {
      await result.current.send('dekat sini')
    })
    await act(async () => {
      await result.current.requestLocation()
    })
    await act(async () => {
      await result.current.send('cari yang lain')
    })

    const lastArg = sendMock.mock.calls[2][0]
    expect(lastArg.location).toEqual({ lat: -8.1, lng: 113.7 })
  })

  it('denied: tidak ada request chat dengan location, status denied', async () => {
    const getCurrentPosition = vi.fn((_success: PositionCallback, error: PositionErrorCallback) => {
      error({ code: 1 } as GeolocationPositionError)
    })
    setGeolocation({ getCurrentPosition })

    sendMock.mockResolvedValueOnce({ reply: 'butuh lokasi', needsLocation: true })

    const { result } = renderHook(() => useChat())

    await act(async () => {
      await result.current.send('dekat sini')
    })
    await act(async () => {
      await result.current.requestLocation()
    })

    expect(result.current.locationStatus).toBe('denied')
    // Hanya request awal; tidak ada resend dengan location.
    expect(sendMock).toHaveBeenCalledTimes(1)
  })

  it('backend 400 dengan location: buang koordinat, tampilkan pesan backend, tidak loop', async () => {
    setGeolocation({ getCurrentPosition: geoSuccess(-8.1, 113.7) })

    sendMock.mockResolvedValueOnce({ reply: 'butuh lokasi', needsLocation: true })
    sendMock.mockRejectedValueOnce(new ApiError('Lokasi Anda berada di luar wilayah Jember.'))

    const { result } = renderHook(() => useChat())

    await act(async () => {
      await result.current.send('dekat sini')
    })
    await act(async () => {
      await result.current.requestLocation()
    })

    expect(result.current.error).toContain('di luar wilayah Jember')
    expect(result.current.error).toContain('kecamatan')
    expect(result.current.needsLocation).toBe(false)

    // Pesan berikutnya tidak otomatis membawa koordinat itu lagi.
    sendMock.mockResolvedValueOnce({ reply: 'oke' })
    await act(async () => {
      await result.current.send('cari di Sumbersari')
    })
    const lastArg = sendMock.mock.calls[sendMock.mock.calls.length - 1][0]
    expect(lastArg.location).toBeUndefined()
  })

  it('tidak loop bila balasan needsLocation padahal koordinat sudah tersimpan', async () => {
    setGeolocation({ getCurrentPosition: geoSuccess(-8.1, 113.7) })

    sendMock.mockResolvedValueOnce({ reply: 'butuh lokasi', needsLocation: true })
    sendMock.mockResolvedValueOnce({ reply: 'ini kedai' })
    sendMock.mockResolvedValueOnce({ reply: 'masih butuh?', needsLocation: true })

    const { result } = renderHook(() => useChat())

    await act(async () => {
      await result.current.send('dekat sini')
    })
    await act(async () => {
      await result.current.requestLocation()
    })
    await act(async () => {
      await result.current.send('halo lagi')
    })

    // Koordinat sudah tersimpan -> jangan minta izin lagi.
    expect(result.current.needsLocation).toBe(false)
  })

  it("clear() mereset koordinat, status 'idle', dan pendingMessage", async () => {
    setGeolocation({ getCurrentPosition: geoSuccess(-8.1, 113.7) })

    sendMock.mockResolvedValueOnce({ reply: 'butuh lokasi', needsLocation: true })
    sendMock.mockResolvedValueOnce({ reply: 'ini kedai' })
    sendMock.mockResolvedValueOnce({ reply: 'oke' })

    const { result } = renderHook(() => useChat())

    await act(async () => {
      await result.current.send('dekat sini')
    })
    await act(async () => {
      await result.current.requestLocation()
    })

    act(() => {
      result.current.clear()
    })

    expect(result.current.locationStatus).toBe('idle')
    expect(result.current.pendingMessage).toBeNull()
    expect(result.current.messages).toHaveLength(0)

    await act(async () => {
      await result.current.send('pesan baru')
    })
    const lastArg = sendMock.mock.calls[sendMock.mock.calls.length - 1][0]
    expect(lastArg.location).toBeUndefined()
  })

  it('tidak memakai localStorage/sessionStorage', async () => {
    setGeolocation({ getCurrentPosition: geoSuccess(-8.1, 113.7) })
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem')

    sendMock.mockResolvedValueOnce({ reply: 'butuh lokasi', needsLocation: true })
    sendMock.mockResolvedValueOnce({ reply: 'ini kedai' })

    const { result } = renderHook(() => useChat())

    await act(async () => {
      await result.current.send('dekat sini')
    })
    await act(async () => {
      await result.current.requestLocation()
    })

    expect(setItemSpy).not.toHaveBeenCalled()
  })
})