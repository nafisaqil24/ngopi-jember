import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useGeolocation } from './useGeolocation'

function setGeolocation(geo: unknown) {
  Object.defineProperty(navigator, 'geolocation', { value: geo, configurable: true, writable: true })
}

describe('hooks/useGeolocation', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'isSecureContext', { value: true, configurable: true })
  })

  afterEach(() => {
    setGeolocation(undefined)
    vi.restoreAllMocks()
  })

  it('sukses: mengembalikan koordinat yang dibulatkan ke 3 desimal', async () => {
    const getCurrentPosition = vi.fn((success: PositionCallback) => {
      success({
        coords: { latitude: -8.17234567, longitude: 113.70081234 },
      } as GeolocationPosition)
    })
    setGeolocation({ getCurrentPosition })

    const { result } = renderHook(() => useGeolocation())

    let coords: { lat: number; lng: number } | null = null
    await act(async () => {
      coords = await result.current.request()
    })

    expect(coords).toEqual({ lat: -8.172, lng: 113.701 })
    expect(result.current.status).toBe('granted')
    expect(getCurrentPosition).toHaveBeenCalledWith(
      expect.any(Function),
      expect.any(Function),
      { timeout: 10000, enableHighAccuracy: false }
    )
  })

  it("denied: error code 1 -> status 'denied' dan null", async () => {
    const getCurrentPosition = vi.fn((_success: PositionCallback, error: PositionErrorCallback) => {
      error({ code: 1 } as GeolocationPositionError)
    })
    setGeolocation({ getCurrentPosition })

    const { result } = renderHook(() => useGeolocation())

    let coords: { lat: number; lng: number } | null = { lat: 0, lng: 0 }
    await act(async () => {
      coords = await result.current.request()
    })

    expect(coords).toBeNull()
    expect(result.current.status).toBe('denied')
  })

  it("unavailable: tanpa navigator.geolocation", async () => {
    setGeolocation(undefined)

    const { result } = renderHook(() => useGeolocation())

    let coords: { lat: number; lng: number } | null = { lat: 0, lng: 0 }
    await act(async () => {
      coords = await result.current.request()
    })

    expect(coords).toBeNull()
    expect(result.current.status).toBe('unavailable')
  })

  it("timeout: error code 3 -> status 'timeout'", async () => {
    const getCurrentPosition = vi.fn((_success: PositionCallback, error: PositionErrorCallback) => {
      error({ code: 3 } as GeolocationPositionError)
    })
    setGeolocation({ getCurrentPosition })

    const { result } = renderHook(() => useGeolocation())

    await act(async () => {
      await result.current.request()
    })

    expect(result.current.status).toBe('timeout')
  })

  it('tidak setState setelah unmount', async () => {
    let capturedSuccess: PositionCallback | null = null
    const getCurrentPosition = vi.fn((success: PositionCallback) => {
      capturedSuccess = success
    })
    setGeolocation({ getCurrentPosition })
    const errorSpy = vi.spyOn(console, 'error')

    const { result, unmount } = renderHook(() => useGeolocation())

    let pending: Promise<{ lat: number; lng: number } | null> | null = null
    act(() => {
      pending = result.current.request()
    })

    unmount()

    await act(async () => {
      capturedSuccess?.({
        coords: { latitude: 1.23456, longitude: 6.78912 },
      } as GeolocationPosition)
      await pending
    })

    // Tidak ada peringatan/kesalahan setState setelah unmount.
    expect(errorSpy).not.toHaveBeenCalled()
  })
})