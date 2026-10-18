import { useCallback, useEffect, useRef, useState } from 'react'

export type GeoStatus =
  | 'idle'
  | 'requesting'
  | 'granted'
  | 'denied'
  | 'unavailable'
  | 'timeout'
  | 'error'

export type GeoCoords = { lat: number; lng: number }

const GEO_TIMEOUT_MS = 10000

// Bulatkan ke 3 desimal (~111 m) untuk privasi; cukup untuk rekomendasi kedai.
function round3(value: number): number {
  return Math.round(value * 1000) / 1000
}

export function useGeolocation() {
  const [status, setStatus] = useState<GeoStatus>('idle')
  const [coords, setCoords] = useState<GeoCoords | null>(null)
  const mountedRef = useRef(true)
  const requestingRef = useRef(false)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const setStatusSafe = useCallback((next: GeoStatus) => {
    if (mountedRef.current) setStatus(next)
  }, [])

  // Hanya dipanggil dari aksi pengguna (klik tombol "Izinkan lokasi").
  const request = useCallback((): Promise<GeoCoords | null> => {
    return new Promise((resolve) => {
      if (requestingRef.current) {
        resolve(null)
        return
      }
      if (typeof navigator === 'undefined' || !navigator.geolocation) {
        setStatusSafe('unavailable')
        resolve(null)
        return
      }
      if (typeof window !== 'undefined' && window.isSecureContext === false) {
        setStatusSafe('unavailable')
        resolve(null)
        return
      }

      requestingRef.current = true
      setStatusSafe('requesting')

      navigator.geolocation.getCurrentPosition(
        (position) => {
          requestingRef.current = false
          const next: GeoCoords = {
            lat: round3(position.coords.latitude),
            lng: round3(position.coords.longitude),
          }
          if (mountedRef.current) {
            setCoords(next)
            setStatus('granted')
          }
          resolve(next)
        },
        (error) => {
          requestingRef.current = false
          const code = (error as { code?: number } | undefined)?.code
          const nextStatus: GeoStatus =
            code === 1 ? 'denied' : code === 2 ? 'unavailable' : code === 3 ? 'timeout' : 'error'
          setStatusSafe(nextStatus)
          resolve(null)
        },
        { timeout: GEO_TIMEOUT_MS, enableHighAccuracy: false }
      )
    })
  }, [setStatusSafe])

  const reset = useCallback(() => {
    requestingRef.current = false
    setStatusSafe('idle')
    if (mountedRef.current) setCoords(null)
  }, [setStatusSafe])

  return { status, coords, request, reset }
}