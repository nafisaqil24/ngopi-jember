import { Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma.js'
import { parsePriceRange, getOpenStatus } from './parsers.js'
import { calculateDistance } from './geo.js'
import { calculateSAW, PriorityLevel, SawCriterion } from './saw.service.js'
import { getEffectiveRating } from '../utils/rating.js'
import { withDbRetry } from '../utils/dbRetry.js'

export interface SearchFilters {
  district?: string
  facilitySlugs?: string[]
  maxPrice?: number
  openNow?: boolean
  searchQuery?: string
  priorities?: Partial<Record<SawCriterion, PriorityLevel>>
}

export interface UserLocation {
  lat: number
  lng: number
  radiusKm?: number
}

const publicShopSelect = {
  slug: true,
  name: true,
  district: true,
  address: true,
  priceRange: true,
  openingHours: true,
  latitude: true,
  longitude: true,
  description: true,
  categories: {
    include: {
      category: {
        select: { name: true, slug: true },
      },
    },
  },
  facilities: {
    include: {
      facility: {
        select: { name: true, slug: true },
      },
    },
  },
  images: {
    take: 1,
    orderBy: { createdAt: 'desc' as const },
    select: { imageUrl: true },
  },
  reviews: {
    select: { rating: true },
  },
  googleRating: true,
  googleReviewCount: true,
  googleRatingAt: true,
  _count: {
    select: { reviews: true },
  },
} satisfies Prisma.CoffeeShopSelect

export type PublicShopResult = {
  slug: string
  name: string
  district: string
  address: string
  priceRange: string
  openingHours: string
  latitude: number | null
  longitude: number | null
  description: string
  categories: string[]
  facilities: string[]
  rating: number | null
  reviewCount: number
  ratingSource?: 'google' | 'ulasan' | null
  image: string | null
  distanceKm?: number
  openStatus?: 'buka' | 'tutup' | 'tidak_diketahui'
  sawScore?: number
  sawDetails?: any
}

export interface SearchResponse {
  shops: PublicShopResult[]
  metadata: {
    totalKedaiTerverifikasi: number
    jumlahTanpaDataHarga: number
    jumlahTanpaJamBuka: number
    jumlahTanpaFasilitas: number
    fallbackUsed?: 'facility_relaxed' | 'price_relaxed' | 'both_relaxed'
  }
}

export function computeDistanceMetrics(
  userLocation: UserLocation | undefined,
  shop: { latitude: number | null; longitude: number | null }
): { distanceKm?: number; distanceKmRaw?: number } {
  if (!userLocation || shop.latitude === null || shop.longitude === null) {
    return {}
  }

  const distanceKmRaw = calculateDistance(
    userLocation.lat,
    userLocation.lng,
    shop.latitude,
    shop.longitude
  )

  return {
    distanceKm: Math.round(distanceKmRaw * 10) / 10,
    distanceKmRaw,
  }
}

async function executeSearch(filters: SearchFilters, userLocation?: UserLocation) {
  const allVerifiedShops = await withDbRetry(() =>
    prisma.coffeeShop.findMany({
      where: {
        isVerified: true,
        ...(filters.district
          ? { district: { contains: filters.district.trim(), mode: 'insensitive' } }
          : {}),
        ...(filters.searchQuery
          ? {
              OR: [
                { name: { contains: filters.searchQuery, mode: 'insensitive' } },
                { description: { contains: filters.searchQuery, mode: 'insensitive' } },
              ],
            }
          : {}),
        ...(filters.facilitySlugs && filters.facilitySlugs.length > 0
          ? {
              facilities: {
                some: {
                  facility: {
                    slug: { in: filters.facilitySlugs },
                  },
                },
              },
            }
          : {}),
      },
      select: publicShopSelect,
    })
  )

  const totalKedaiTerverifikasi = allVerifiedShops.length
  let jumlahTanpaDataHarga = 0
  let jumlahTanpaJamBuka = 0
  let jumlahTanpaFasilitas = 0

  const now = new Date()

  const rawDistanceBySlug = new Map<string, number>()

  const processed: PublicShopResult[] = allVerifiedShops.map((shop) => {
    const priceParsed = parsePriceRange(shop.priceRange)
    if (!priceParsed) jumlahTanpaDataHarga++

    const openStatus = getOpenStatus(shop.openingHours, now)
    if (openStatus === 'tidak_diketahui') jumlahTanpaJamBuka++

    const facilityNames = shop.facilities.map((f) => f.facility.name)
    if (facilityNames.length === 0) jumlahTanpaFasilitas++

    const categoryNames = shop.categories.map((c) => c.category.name)

    const effective = getEffectiveRating(shop)

    const truncatedDesc =
      shop.description.length > 160
        ? shop.description.slice(0, 157) + '...'
        : shop.description

    const { distanceKm, distanceKmRaw } = computeDistanceMetrics(userLocation, shop)
    if (distanceKmRaw !== undefined) {
      rawDistanceBySlug.set(shop.slug, distanceKmRaw)
    }

    return {
      slug: shop.slug,
      name: shop.name,
      district: shop.district,
      address: shop.address,
      priceRange: shop.priceRange,
      openingHours: shop.openingHours,
      latitude: shop.latitude,
      longitude: shop.longitude,
      description: truncatedDesc,
      categories: categoryNames,
      facilities: facilityNames,
      rating: effective.rating,
      reviewCount: effective.reviewCount,
      ratingSource: effective.ratingSource,
      image: shop.images[0]?.imageUrl ?? null,
      distanceKm,
      openStatus,
    }
  })

  let filtered = processed.filter((shop) => {
    if (filters.maxPrice !== undefined) {
      const parsed = parsePriceRange(shop.priceRange)
      if (!parsed || parsed.min === null) {
        return false
      }
      if (parsed.min > filters.maxPrice) {
        return false
      }
    }

    if (filters.openNow === true) {
      if (shop.openStatus !== 'buka') {
        return false
      }
    }

    if (userLocation && userLocation.radiusKm !== undefined && shop.distanceKm !== undefined) {
      if (shop.distanceKm > userLocation.radiusKm) {
        return false
      }
    }

    return true
  })

  const sawInputs = filtered.map((shop) => {
    const priceParsed = parsePriceRange(shop.priceRange)
    let priceMidpoint: number | null = null
    if (priceParsed && priceParsed.min !== null && priceParsed.max !== null) {
      priceMidpoint = (priceParsed.min + priceParsed.max) / 2
    } else if (priceParsed && priceParsed.min !== null) {
      priceMidpoint = priceParsed.min
    } else if (priceParsed && priceParsed.max !== null) {
      priceMidpoint = priceParsed.max
    }

    return {
      slug: shop.slug,
      distanceKm: rawDistanceBySlug.get(shop.slug),
      priceMidpoint,
      rating: shop.rating,
      facilityCount: shop.facilities.length,
    }
  })

  const includeDistance = !!userLocation
  const sawResults = calculateSAW(sawInputs, includeDistance, filters.priorities)
  const sawMap = new Map(sawResults.map((r) => [r.slug, r]))

  filtered.sort((a, b) => {
    const scoreA = sawMap.get(a.slug)?.score ?? 0
    const scoreB = sawMap.get(b.slug)?.score ?? 0
    return scoreB - scoreA
  })

  for (const shop of filtered) {
    const res = sawMap.get(shop.slug)
    if (res) {
      shop.sawScore = res.score
      shop.sawDetails = res.details
    }
  }

  const limited = filtered.slice(0, 5)

  return {
    shops: limited,
    metadata: {
      totalKedaiTerverifikasi,
      jumlahTanpaDataHarga,
      jumlahTanpaJamBuka,
      jumlahTanpaFasilitas,
    },
  }
}

export async function searchShops(
  filters: SearchFilters,
  userLocation?: UserLocation
): Promise<SearchResponse> {
  let activeFilters = { ...filters }
  let fallbackUsed: 'facility_relaxed' | 'price_relaxed' | 'both_relaxed' | undefined = undefined

  let result = await executeSearch(activeFilters, userLocation)

  if (result.shops.length === 0) {
    // Fallback A: relax facilitySlugs if present
    if (activeFilters.facilitySlugs && activeFilters.facilitySlugs.length > 0) {
      activeFilters = { ...activeFilters, facilitySlugs: undefined }
      const resA = await executeSearch(activeFilters, userLocation)
      if (resA.shops.length > 0) {
        result = resA
        fallbackUsed = 'facility_relaxed'
      }
    }

    // Fallback B: relax maxPrice if still 0 and maxPrice was present
    if (result.shops.length === 0 && activeFilters.maxPrice !== undefined) {
      activeFilters = { ...activeFilters, facilitySlugs: undefined, maxPrice: undefined }
      const resB = await executeSearch(activeFilters, userLocation)
      if (resB.shops.length > 0) {
        result = resB
        fallbackUsed = filters.facilitySlugs && filters.facilitySlugs.length > 0 ? 'both_relaxed' : 'price_relaxed'
      }
    }
  }

  return {
    shops: result.shops,
    metadata: {
      ...result.metadata,
      fallbackUsed,
    },
  }
}

export async function getShopBySlugOrName(query: string): Promise<PublicShopResult | null> {
  const q = query.trim()
  const shop = await withDbRetry(() =>
    prisma.coffeeShop.findFirst({
      where: {
        isVerified: true,
        OR: [
          { slug: { equals: q, mode: 'insensitive' } },
          { name: { contains: q, mode: 'insensitive' } },
        ],
      },
      select: publicShopSelect,
    })
  )

  if (!shop) return null

  const now = new Date()
  const openStatus = getOpenStatus(shop.openingHours, now)
  const facilityNames = shop.facilities.map((f) => f.facility.name)
  const categoryNames = shop.categories.map((c) => c.category.name)
  const effective = getEffectiveRating(shop)

  const truncatedDesc =
    shop.description.length > 160
      ? shop.description.slice(0, 157) + '...'
      : shop.description

  return {
    slug: shop.slug,
    name: shop.name,
    district: shop.district,
    address: shop.address,
    priceRange: shop.priceRange,
    openingHours: shop.openingHours,
    latitude: shop.latitude,
    longitude: shop.longitude,
    description: truncatedDesc,
    categories: categoryNames,
    facilities: facilityNames,
    rating: effective.rating,
    reviewCount: effective.reviewCount,
    ratingSource: effective.ratingSource,
    image: shop.images[0]?.imageUrl ?? null,
    openStatus,
  }
}
