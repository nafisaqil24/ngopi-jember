export type SawCriterion = 'distance' | 'price' | 'rating' | 'facility'
export type PriorityLevel = 'tinggi' | 'normal' | 'rendah'

export const DEFAULT_WEIGHTS: Record<SawCriterion, number> = {
  distance: 0.30,
  price: 0.25,
  rating: 0.30,
  facility: 0.15,
}

export const PRIORITY_MULTIPLIERS: Record<PriorityLevel, number> = {
  tinggi: 2,
  normal: 1,
  rendah: 0.5,
}

export interface SawShopInput {
  slug: string
  distanceKm?: number | null
  priceMidpoint?: number | null
  rating?: number | null
  facilityCount: number
}

export interface SawCriterionDetail {
  raw: number
  normalized: number
  weight: number
}

export interface SawResultItem {
  slug: string
  score: number
  details: Partial<Record<SawCriterion, SawCriterionDetail>>
}

/**
 * Menyelesaikan bobot kriteria berdasarkan:
 * 1. Apakah kriteria jarak diikutsertakan (includeDistance).
 * 2. Apakah ada prioritas pengguna dari LLM.
 * 3. Apakah suatu kriteria seluruhnya tidak memiliki data (allValuesMissing).
 * 
 * Rumus pengali: bobot_default * multiplier(level). Kriteria tanpa prioritas = level normal (1).
 * Bobot kemudian dinormalisasi ulang (dibagi total bobot aktif) agar jumlahnya tepat 1.0.
 * Jika tidak ada prioritas dan includeDistance=true serta semua kriteria aktif,
 * mengembalikan DEFAULT_WEIGHTS secara persis (short-circuit).
 */
export function resolveWeights(
  includeDistance: boolean,
  priorities?: Partial<Record<SawCriterion, PriorityLevel>>,
  activeCriteria?: Record<SawCriterion, boolean>
): Record<SawCriterion, number> {
  const hasPriorities = priorities && Object.keys(priorities).length > 0
  const criteria: SawCriterion[] = ['distance', 'price', 'rating', 'facility']

  // Cek kriteria mana saja yang aktif
  const active: Record<SawCriterion, boolean> = {
    distance: includeDistance && (activeCriteria?.distance ?? true),
    price: activeCriteria?.price ?? true,
    rating: activeCriteria?.rating ?? true,
    facility: activeCriteria?.facility ?? true,
  }

  // Jika tidak ada prioritas dan semua kriteria aktif, kembalikan DEFAULT_WEIGHTS persis
  if (
    !hasPriorities &&
    active.distance &&
    active.price &&
    active.rating &&
    active.facility
  ) {
    return { ...DEFAULT_WEIGHTS }
  }

  const rawWeights: Partial<Record<SawCriterion, number>> = {}
  let totalWeight = 0

  for (const c of criteria) {
    if (!active[c]) continue
    const defaultW = DEFAULT_WEIGHTS[c]
    const level = priorities?.[c]
    const mult = level ? PRIORITY_MULTIPLIERS[level] : 1
    const w = defaultW * mult
    rawWeights[c] = w
    totalWeight += w
  }

  const resolved = {} as Record<SawCriterion, number>
  if (totalWeight <= 0) {
    // Fallback jika semua bobot 0
    const activeCount = Object.values(active).filter(Boolean).length || 1
    for (const c of criteria) {
      if (active[c]) {
        resolved[c] = 1 / activeCount
      }
    }
    return resolved
  }

  for (const c of criteria) {
    if (active[c] && rawWeights[c] !== undefined) {
      resolved[c] = rawWeights[c]! / totalWeight
    }
  }

  return resolved
}

/**
 * Menghitung perankingan Simple Additive Weighting (SAW) murni (tanpa akses database).
 * 
 * Aturan Kriteria:
 * - jarak (Cost): min / x (jika x=0 -> 1)
 * - harga (Cost): min / x (jika x=0 -> 1)
 * - rating (Benefit): x / max (jika max=0 -> 0)
 * - fasilitas (Benefit): x / max (jika max=0 -> 0)
 * 
 * Penanganan Data Kosong (Nilai Terburuk):
 * - Harga null/tidak terparse: diisi nilai maksimum harga dalam dataset (terburuk).
 * - Rating null: diisi 0.
 * - Jarak null (bila diikutsertakan): diisi jarak maksimum dalam dataset.
 */
export function calculateSAW(
  shops: SawShopInput[],
  includeDistance: boolean,
  priorities?: Partial<Record<SawCriterion, PriorityLevel>>
): SawResultItem[] {
  if (shops.length === 0) return []

  // 1. Cek validitas data mentah sebelum fallback
  const validPrices = shops.map((s) => s.priceMidpoint).filter((v): v is number => v !== null && v !== undefined && !isNaN(v))
  const allPricesMissing = validPrices.length === 0
  const maxPrice = validPrices.length > 0 ? Math.max(...validPrices) : 0

  const validRatings = shops.map((s) => s.rating).filter((v): v is number => v !== null && v !== undefined && !isNaN(v))
  const allRatingsMissing = validRatings.length === 0

  const validDistances = shops.map((s) => s.distanceKm).filter((v): v is number => v !== null && v !== undefined && !isNaN(v))
  const maxDistance = validDistances.length > 0 ? Math.max(...validDistances) : 0

  const prepared = shops.map((shop) => {
    let price = shop.priceMidpoint
    if (price === null || price === undefined || isNaN(price)) {
      price = maxPrice > 0 ? maxPrice : 0
    }

    let dist = shop.distanceKm
    if (includeDistance) {
      if (dist === null || dist === undefined || isNaN(dist)) {
        dist = maxDistance > 0 ? maxDistance : 0
      }
    } else {
      dist = 0
    }

    let rating = shop.rating
    if (rating === null || rating === undefined || isNaN(rating)) {
      rating = 0
    }

    const facility = shop.facilityCount

    return {
      slug: shop.slug,
      raw: {
        distance: dist,
        price: price,
        rating: rating,
        facility: facility,
      },
    }
  })

  // 2. Cek apakah ada kriteria yang seluruhnya kosong/sama
  const allRatingsZero = prepared.every((s) => s.raw.rating === 0)
  const allFacilitiesZero = prepared.every((s) => s.raw.facility === 0)
  const allDistancesSame = includeDistance && prepared.every((s) => s.raw.distance === prepared[0].raw.distance)

  const activeCriteria: Record<SawCriterion, boolean> = {
    distance: includeDistance && !allDistancesSame && validDistances.length > 0,
    price: !allPricesMissing,
    rating: !allRatingsMissing && !allRatingsZero,
    facility: !allFacilitiesZero,
  }

  const weights = resolveWeights(includeDistance, priorities, activeCriteria)
  const activeKeys = Object.keys(weights) as SawCriterion[]

  if (activeKeys.length === 0) {
    // Jika tidak ada kriteria aktif, kembalikan urutan asli dengan skor 0
    return shops.map((s) => ({ slug: s.slug, score: 0, details: {} }))
  }

  // 3. Hitung min dan max per kriteria aktif untuk normalisasi matriks keputusan
  const rawValues: Record<SawCriterion, number[]> = {
    distance: prepared.map((s) => s.raw.distance),
    price: prepared.map((s) => s.raw.price),
    rating: prepared.map((s) => s.raw.rating),
    facility: prepared.map((s) => s.raw.facility),
  }

  const minVals: Record<SawCriterion, number> = {
    distance: Math.min(...rawValues.distance),
    price: Math.min(...rawValues.price),
    rating: Math.min(...rawValues.rating),
    facility: Math.min(...rawValues.facility),
  }

  const maxVals: Record<SawCriterion, number> = {
    distance: Math.max(...rawValues.distance),
    price: Math.max(...rawValues.price),
    rating: Math.max(...rawValues.rating),
    facility: Math.max(...rawValues.facility),
  }

  // 4. Hitung normalisasi dan skor preferensi akhir (V_i)
  const results: SawResultItem[] = prepared.map((shop) => {
    const details: Partial<Record<SawCriterion, SawCriterionDetail>> = {}
    let score = 0

    for (const c of activeKeys) {
      const raw = shop.raw[c]
      const w = weights[c] ?? 0
      let normalized = 0

      // Kriteria Cost: distance, price -> R_ij = min / x_ij
      if (c === 'distance' || c === 'price') {
        const minVal = minVals[c]
        if (raw === 0) {
          normalized = 1
        } else if (minVal === 0) {
          normalized = raw === 0 ? 1 : 0
        } else if (minVals[c] === maxVals[c]) {
          normalized = 1 // semua nilai sama
        } else {
          normalized = minVal / raw
        }
      } 
      // Kriteria Benefit: rating, facility -> R_ij = x_ij / max
      else {
        const maxVal = maxVals[c]
        if (maxVal === 0) {
          normalized = 0
        } else if (minVals[c] === maxVals[c]) {
          normalized = 1 // semua nilai sama
        } else {
          normalized = raw / maxVal
        }
      }

      details[c] = {
        raw,
        normalized: Math.round(normalized * 10000) / 10000,
        weight: Math.round(w * 10000) / 10000,
      }

      score += normalized * w
    }

    return {
      slug: shop.slug,
      score: Math.round(score * 10000) / 10000,
      details,
    }
  })

  // 5. Urutkan berdasarkan skor akhir secara descending
  results.sort((a, b) => b.score - a.score)

  return results
}
