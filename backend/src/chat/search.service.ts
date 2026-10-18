import { Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma.js'
import { parsePriceRange, getOpenStatus } from './parsers.js'
import { calculateDistance } from './geo.js'

export interface SearchFilters {
  district?: string
  facilitySlugs?: string[]
  maxPrice?: number
  openNow?: boolean
  searchQuery?: string
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
  image: string | null
  distanceKm?: number
  openStatus?: 'buka' | 'tutup' | 'tidak_diketahui'
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

async function executeSearch(filters: SearchFilters, userLocation?: UserLocation) {
  const allVerifiedShops = await prisma.coffeeShop.findMany({
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

  const totalKedaiTerverifikasi = allVerifiedShops.length
  let jumlahTanpaDataHarga = 0
  let jumlahTanpaJamBuka = 0
  let jumlahTanpaFasilitas = 0

  const now = new Date()

  const processed: PublicShopResult[] = allVerifiedShops.map((shop) => {
    const priceParsed = parsePriceRange(shop.priceRange)
    if (!priceParsed) jumlahTanpaDataHarga++

    const openStatus = getOpenStatus(shop.openingHours, now)
    if (openStatus === 'tidak_diketahui') jumlahTanpaJamBuka++

    const facilityNames = shop.facilities.map((f) => f.facility.name)
    if (facilityNames.length === 0) jumlahTanpaFasilitas++

    const categoryNames = shop.categories.map((c) => c.category.name)

    const rating = shop.reviews.length
      ? shop.reviews.reduce((sum, r) => sum + r.rating, 0) / shop.reviews.length
      : null

    const truncatedDesc =
      shop.description.length > 160
        ? shop.description.slice(0, 157) + '...'
        : shop.description

    let distanceKm: number | undefined = undefined
    if (userLocation && shop.latitude !== null && shop.longitude !== null) {
      distanceKm =
        Math.round(
          calculateDistance(userLocation.lat, userLocation.lng, shop.latitude, shop.longitude) * 10
        ) / 10
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
      rating: rating ? Math.round(rating * 10) / 10 : null,
      reviewCount: shop._count.reviews,
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

  if (userLocation) {
    filtered.sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999))
  } else {
    filtered.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
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
  const shop = await prisma.coffeeShop.findFirst({
    where: {
      isVerified: true,
      OR: [
        { slug: { equals: q, mode: 'insensitive' } },
        { name: { contains: q, mode: 'insensitive' } },
      ],
    },
    select: publicShopSelect,
  })

  if (!shop) return null

  const now = new Date()
  const openStatus = getOpenStatus(shop.openingHours, now)
  const facilityNames = shop.facilities.map((f) => f.facility.name)
  const categoryNames = shop.categories.map((c) => c.category.name)
  const rating = shop.reviews.length
    ? shop.reviews.reduce((sum, r) => sum + r.rating, 0) / shop.reviews.length
    : null

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
    rating: rating ? Math.round(rating * 10) / 10 : null,
    reviewCount: shop._count.reviews,
    image: shop.images[0]?.imageUrl ?? null,
    openStatus,
  }
}
