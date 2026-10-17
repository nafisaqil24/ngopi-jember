export const JEMBER_LAT_MIN = -8.6
export const JEMBER_LAT_MAX = -7.8
export const JEMBER_LNG_MIN = 113.2
export const JEMBER_LNG_MAX = 114.2

export function isWithinJember(lat: number, lng: number): boolean {
  if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) {
    return false
  }
  return (
    lat >= JEMBER_LAT_MIN &&
    lat <= JEMBER_LAT_MAX &&
    lng >= JEMBER_LNG_MIN &&
    lng <= JEMBER_LNG_MAX
  )
}

export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * (Math.PI / 180)
  const dLon = (lon2 - lon1) * (Math.PI / 180)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}
