import { AnalyticsEventType, Prisma } from '@prisma/client'
import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { authenticate, authorize, type AuthenticatedRequest } from '../middleware/auth.js'
import { upload, uploadToCloudinaryIfNeeded } from '../middleware/upload.js'
import { menuRouter } from './menu.routes.js'
import { reviewRouter } from './review.routes.js'
import { getEffectiveRating } from '../utils/rating.js'
import { slugify } from '../utils/slug.js'
import {
  buildOpeningHoursSummary,
  entriesToResponse,
  entryFromInput,
  getOpenStatus,
  type OpeningHourEntry,
} from '../utils/openingHours.js'

export const coffeeShopRouter = Router()

coffeeShopRouter.use('/:coffeeShopId/menus', menuRouter)
coffeeShopRouter.use('/:coffeeShopId/reviews', reviewRouter)

const listQuery = z.object({
  search: z.string().trim().max(100).optional(),
  district: z.string().trim().max(80).optional(),
  minRating: z.coerce.number().min(1).max(5).optional(),
  facility: z.string().trim().max(80).optional(),
  featured: z.enum(['true', 'false']).optional(),
  sort: z.enum(['popular', 'new', 'rating']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
})

// Batas wilayah Jember (bounding box) untuk validasi koordinat.
const JEMBER_LAT_MIN = -8.6
const JEMBER_LAT_MAX = -7.8
const JEMBER_LNG_MIN = 113.2
const JEMBER_LNG_MAX = 114.2

// Titik tengah Sumbersari yang dipakai sebagai placeholder default di form.
// Kafe baru tidak boleh memakai koordinat ini supaya lokasi benar-benar dipilih.
const PLACEHOLDER_LAT = -8.1721
const PLACEHOLDER_LNG = 113.7008

// String kosong / null dari multipart TIDAK boleh terbaca sebagai angka 0.
// Nilai kosong diperlakukan sebagai "tidak diisi" (undefined).
const emptyToUndefined = (value: unknown) => (value === '' || value === null ? undefined : value)

const latitudeField = z.preprocess(
  emptyToUndefined,
  z.coerce.number()
    .min(JEMBER_LAT_MIN, { message: `Latitude harus di wilayah Jember (${JEMBER_LAT_MIN} s.d. ${JEMBER_LAT_MAX})` })
    .max(JEMBER_LAT_MAX, { message: `Latitude harus di wilayah Jember (${JEMBER_LAT_MIN} s.d. ${JEMBER_LAT_MAX})` })
    .optional(),
)

const longitudeField = z.preprocess(
  emptyToUndefined,
  z.coerce.number()
    .min(JEMBER_LNG_MIN, { message: `Longitude harus di wilayah Jember (${JEMBER_LNG_MIN} s.d. ${JEMBER_LNG_MAX})` })
    .max(JEMBER_LNG_MAX, { message: `Longitude harus di wilayah Jember (${JEMBER_LNG_MIN} s.d. ${JEMBER_LNG_MAX})` })
    .optional(),
)

// Aturan: latitude & longitude harus diisi KEDUANYA atau dikosongkan KEDUANYA.
const coordinatesRule = (data: { latitude?: number; longitude?: number }, ctx: z.RefinementCtx) => {
  const hasLat = data.latitude !== undefined && data.latitude !== null
  const hasLng = data.longitude !== undefined && data.longitude !== null
  if (hasLat !== hasLng) {
    ctx.addIssue({
      code: 'custom',
      path: ['latitude'],
      message: 'Latitude dan longitude harus diisi keduanya atau dikosongkan keduanya',
    })
  }
}

// Kafe baru tidak boleh memakai koordinat placeholder default (-8.1721, 113.7008).
// Koordinat kosong tetap diperbolehkan; yang ditolak hanya titik default persis.
const rejectPlaceholderCoordinates = (
  data: { latitude?: number; longitude?: number },
  ctx: z.RefinementCtx,
) => {
  if (data.latitude === PLACEHOLDER_LAT && data.longitude === PLACEHOLDER_LNG) {
    ctx.addIssue({
      code: 'custom',
      path: ['latitude'],
      message: 'Koordinat tidak boleh memakai titik default (-8.1721, 113.7008); tandai lokasi kafe yang sebenarnya',
    })
  }
}

const HHMM_FIELD = /^([01]\d|2[0-3]):[0-5]\d$/

const hhmmField = z
  .string()
  .trim()
  .regex(HHMM_FIELD, { message: 'Format jam harus HH:MM (00:00-23:59)' })

const openingHourInputSchema = z
  .object({
    dayOfWeek: z.coerce.number().int().min(0).max(6),
    open: hhmmField.optional(),
    close: hhmmField.optional(),
    isClosed: z.boolean().optional().default(false),
  })
  .superRefine((entry, ctx) => {
    if (entry.isClosed) return
    if (!entry.open) {
      ctx.addIssue({ code: 'custom', path: ['open'], message: 'open wajib diisi jika isClosed false' })
    }
    if (!entry.close) {
      ctx.addIssue({ code: 'custom', path: ['close'], message: 'close wajib diisi jika isClosed false' })
    }
  })

const openingHourEntriesSchema = z
  .array(openingHourInputSchema)
  .length(7, { message: 'openingHourEntries harus berisi tepat 7 item' })
  .superRefine((entries, ctx) => {
    const seen = new Set<number>()
    entries.forEach((entry, index) => {
      if (seen.has(entry.dayOfWeek)) {
        ctx.addIssue({
          code: 'custom',
          path: [index, 'dayOfWeek'],
          message: 'dayOfWeek tidak boleh duplikat',
        })
      }
      seen.add(entry.dayOfWeek)
    })
  })

// Dukung klien multipart yang mengirim array sebagai string JSON.
const parseEntriesIfString = (value: unknown) => {
  if (typeof value !== 'string') return value
  try {
    return JSON.parse(value)
  } catch {
    return value
  }
}

const shopFields = z.object({
  name: z.string().trim().min(3).max(120),
  description: z.string().trim().min(10).max(2000),
  address: z.string().trim().min(5).max(200),
  district: z.string().trim().min(2).max(80),
  priceRange: z.string().trim().min(1).max(50),
  openingHours: z.string().trim().min(1).max(200).optional(),
  openingHourEntries: z.preprocess(parseEntriesIfString, openingHourEntriesSchema.optional()),
  phone: z.string().trim().max(30).optional(),
  instagram: z.string().trim().max(200).optional(),
  latitude: latitudeField,
  longitude: longitudeField,
  status: z.enum(['OPEN', 'CLOSED', 'TEMPORARILY_CLOSED']).optional(),
})

const requireOpeningHoursSource = (
  data: { openingHours?: string; openingHourEntries?: unknown },
  ctx: z.RefinementCtx,
) => {
  if (!data.openingHours && !data.openingHourEntries) {
    ctx.addIssue({
      code: 'custom',
      path: ['openingHours'],
      message: 'openingHours atau openingHourEntries wajib diisi',
    })
  }
}

const createShop = shopFields
  .superRefine(coordinatesRule)
  .superRefine(rejectPlaceholderCoordinates)
  .superRefine(requireOpeningHoursSource)

// updateShop sengaja TIDAK memuat ownerId/isVerified sehingga tidak bisa diubah lewat endpoint ini.
const updateShop = shopFields.partial().superRefine(coordinatesRule)

const assignRefs = z.object({
  categoryIds: z.array(z.string().cuid()).optional(),
  facilityIds: z.array(z.string().cuid()).optional(),
})

const nearbyQuery = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  radius: z.coerce.number().positive().default(25),
  limit: z.coerce.number().int().min(1).max(30).default(10),
})

const eventInput = z.object({
  eventType: z.nativeEnum(AnalyticsEventType),
})

// Rate limit ringan untuk pencatatan event publik, mengikuti pola di
// auth.routes.ts (express-rate-limit). 60 request/menit per IP.
const eventLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Terlalu banyak permintaan, coba lagi nanti',
  },
})

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
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

const openingHourEntriesInclude = {
  select: {
    dayOfWeek: true,
    openMinutes: true,
    closeMinutes: true,
    isClosed: true,
  },
  orderBy: { dayOfWeek: 'asc' as const },
}

const cardInclude = {
  facilities: { include: { facility: true } },
  images: { take: 1, orderBy: { createdAt: 'desc' as const } },
  reviews: { select: { rating: true } },
  openingHourEntries: openingHourEntriesInclude,
  _count: { select: { reviews: true } },
} satisfies Prisma.CoffeeShopInclude

interface ShopWithSchedule {
  status: string
  openingHours: string
  openingHourEntries: OpeningHourEntry[]
}

function withSchedule<T extends ShopWithSchedule>(shop: T) {
  return {
    ...shop,
    openingHourEntries: entriesToResponse(shop.openingHourEntries),
    openStatus: getOpenStatus({
      status: shop.status,
      openingHourEntries: shop.openingHourEntries,
      openingHours: shop.openingHours,
    }),
  }
}

async function uniqueSlug(name: string) {
  const base = slugify(name)
  let slug = base
  let counter = 1
  while (await prisma.coffeeShop.findUnique({ where: { slug }, select: { id: true } })) {
    slug = `${base}-${counter}`
    counter += 1
  }
  return slug
}

// DIUBAH: parameter id sekarang menerima string ATAU string[],
// karena di Express 5, request.params.<nama> tipenya string | string[].
// Di dalam function, kita "ratakan" ke string tunggal sebelum dipakai.
async function findOwnedShop(id: string | string[], request: AuthenticatedRequest) {
  const shopId = Array.isArray(id) ? id[0] : id
  const shop = await prisma.coffeeShop.findUnique({ where: { id: shopId } })
  if (!shop) return { shop: null, forbidden: false }

  const isOwner = shop.ownerId === request.auth!.userId
  const isAdmin = request.auth!.role === 'ADMIN'

  return { shop, forbidden: !isOwner && !isAdmin }
}

coffeeShopRouter.get('/', async (request, response, next) => {
  try {
    const parsed = listQuery.safeParse(request.query)
    if (!parsed.success) return response.status(400).json({ success: false, message: 'Parameter pencarian tidak valid', errors: parsed.error.flatten().fieldErrors })
    const { search, district, minRating, facility, featured, sort, page, limit } = parsed.data
    const where: Prisma.CoffeeShopWhereInput = {
      isVerified: true,
      ...(search ? { OR: [{ name: { contains: search, mode: 'insensitive' } }, { district: { contains: search, mode: 'insensitive' } }] } : {}),
      ...(district ? { district: { contains: district.trim(), mode: 'insensitive' } } : {}),
      ...(featured ? { isFeatured: featured === 'true' } : {}),
      ...(facility ? { facilities: { some: { facility: { slug: facility } } } } : {}),
    }

    let orderBy: Prisma.CoffeeShopOrderByWithRelationInput | Prisma.CoffeeShopOrderByWithRelationInput[] = [{ isFeatured: 'desc' }, { createdAt: 'desc' }]
    if (sort === 'popular') {
      orderBy = [{ reviews: { _count: 'desc' } }, { createdAt: 'desc' }]
    } else if (sort === 'new') {
      orderBy = { createdAt: 'desc' }
    }

    const [shops, total] = await prisma.$transaction([
      prisma.coffeeShop.findMany({ where, include: cardInclude, orderBy, skip: (page - 1) * limit, take: limit }),
      prisma.coffeeShop.count({ where }),
    ])
    const results = shops.filter(shop => {
      if (!minRating) return true
      const effective = getEffectiveRating(shop)
      return effective.rating === null || effective.rating >= minRating
    })
    return response.json({ success: true, data: results.map(toCard), meta: { page, limit, total, totalPages: Math.ceil(total / limit) } })
  } catch (error) { return next(error) }
})

coffeeShopRouter.get('/nearby', async (request, response, next) => {
  try {
    const parsed = nearbyQuery.safeParse(request.query)
    if (!parsed.success) {
      return response.status(400).json({
        success: false,
        message: 'Parameter koordinat (lat, lng) tidak valid',
        errors: parsed.error.flatten().fieldErrors,
      })
    }

    const { lat, lng, radius, limit } = parsed.data

    const shops = await prisma.coffeeShop.findMany({
      where: {
        isVerified: true,
        latitude: { not: null },
        longitude: { not: null },
      },
      include: cardInclude,
    })

    const shopsWithDistance = shops.map((shop) => {
      const distance = calculateDistance(lat, lng, shop.latitude!, shop.longitude!)
      const effective = getEffectiveRating(shop)
      const rating = effective.rating ?? 0

      return {
        ...toCard(shop),
        rating,
        distance: Math.round(distance * 10) / 10,
      }
    })

    const filteredAndSorted = shopsWithDistance
      .filter((shop) => shop.distance <= radius)
      .sort((a, b) => {
        // Sistem Skor Gabungan (Composite Scoring):
        // Menggabungkan rating (makin tinggi makin baik) dan jarak (makin dekat makin baik).
        // Skor = (rating * 1.5) - (jarak * 0.3)
        // Kedai dengan skor tertinggi akan berada di urutan paling atas.
        const scoreA = (a.rating * 1.5) - (a.distance * 0.3)
        const scoreB = (b.rating * 1.5) - (b.distance * 0.3)
        return scoreB - scoreA
      })
      .slice(0, limit)

    return response.json({
      success: true,
      data: filteredAndSorted,
      meta: {
        userLocation: { lat, lng },
        radius,
        totalFound: filteredAndSorted.length,
      },
    })
  } catch (error) {
    return next(error)
  }
})

coffeeShopRouter.get('/:slug', async (request, response, next) => {
  try {
    const slug = z.string().regex(/^[a-z0-9-]{1,200}$/).safeParse(request.params.slug)
    if (!slug.success) return response.status(400).json({ success: false, message: 'Slug coffee shop tidak valid' })
    const shop = await prisma.coffeeShop.findUnique({ where: { slug: slug.data }, include: { categories: { include: { category: true } }, facilities: { include: { facility: true } }, images: { orderBy: { createdAt: 'desc' } }, menus: { orderBy: { createdAt: 'asc' } }, promotions: { where: { isActive: true }, orderBy: { createdAt: 'desc' } }, reviews: { include: { user: { select: { name: true } } }, orderBy: { createdAt: 'desc' } }, subscription: true, openingHourEntries: openingHourEntriesInclude } })
    if (!shop || !shop.isVerified) return response.status(404).json({ success: false, message: 'Coffee shop tidak ditemukan' })
    const effective = getEffectiveRating(shop)
    const { ownerId: _ownerId, subscription: _subscription, openingHourEntries, ...publicShop } = shop
    return response.json({
      success: true,
      data: {
        ...publicShop,
        openingHourEntries: entriesToResponse(openingHourEntries),
        openStatus: getOpenStatus({
          status: shop.status,
          openingHourEntries,
          openingHours: shop.openingHours,
        }),
        rating: effective.rating,
        reviewCount: effective.reviewCount,
        ratingSource: effective.ratingSource,
        googleReviewCount: effective.googleReviewCount,
        googleRatingAt: effective.googleRatingAt,
      },
    })
  } catch (error) { return next(error) }
})

// POST /api/coffee-shops/:id/events
// Pencatatan analitik publik (mis. view, klik WhatsApp/Instagram/Maps, lihat menu).
// Hanya kedai yang ADA dan sudah isVerified yang boleh dicatat. Tidak ada
// data pribadi yang disimpan (hanya eventType sesuai enum AnalyticsEventType).
coffeeShopRouter.post('/:id/events', eventLimiter, async (request, response, next) => {
  try {
    const parsed = eventInput.safeParse(request.body)
    if (!parsed.success) return response.status(400).json({ success: false, message: 'Jenis event tidak valid', errors: parsed.error.flatten().fieldErrors })

    const id = Array.isArray(request.params.id) ? request.params.id[0] : request.params.id
    const shop = await prisma.coffeeShop.findUnique({ where: { id }, select: { id: true, isVerified: true } })
    if (!shop || !shop.isVerified) return response.status(404).json({ success: false, message: 'Coffee shop tidak ditemukan' })

    await prisma.analyticsEvent.create({ data: { coffeeShopId: shop.id, eventType: parsed.data.eventType } })
    return response.status(201).json({ success: true })
  } catch (error) { return next(error) }
})

coffeeShopRouter.post('/', authenticate, authorize('OWNER', 'ADMIN'), upload.single('image'), async (request: AuthenticatedRequest, response, next) => {
  try {
    const parsed = createShop.safeParse(request.body)
    if (!parsed.success) return response.status(400).json({ success: false, message: 'Data coffee shop tidak valid', errors: parsed.error.flatten().fieldErrors })

    const { openingHours: openingHoursInput, openingHourEntries: entriesInput, ...shopData } = parsed.data
    const entries = entriesInput ? entriesInput.map(entryFromInput) : null
    const openingHours = entries ? buildOpeningHoursSummary(entries) : openingHoursInput!

    const slug = await uniqueSlug(shopData.name)
    const imageUrl = await uploadToCloudinaryIfNeeded(request.file)
    const shop = await prisma.coffeeShop.create({
      data: {
        ...shopData,
        openingHours,
        slug,
        ownerId: request.auth!.userId,
        ...(entries ? { openingHourEntries: { create: entries } } : {}),
        ...(imageUrl ? { images: { create: { imageUrl } } } : {}),
      },
      include: { images: true, openingHourEntries: openingHourEntriesInclude },
    })
    return response.status(201).json({ success: true, data: withSchedule(shop) })
  } catch (error) { return next(error) }
})

coffeeShopRouter.put('/:id', authenticate, authorize('OWNER', 'ADMIN'), upload.single('image'), async (request: AuthenticatedRequest, response, next) => {
  try {
    const parsed = updateShop.safeParse(request.body)
    if (!parsed.success) return response.status(400).json({ success: false, message: 'Data coffee shop tidak valid', errors: parsed.error.flatten().fieldErrors })

    const { shop, forbidden } = await findOwnedShop(request.params.id, request)
    if (!shop) return response.status(404).json({ success: false, message: 'Coffee shop tidak ditemukan' })
    if (forbidden) return response.status(403).json({ success: false, message: 'Anda tidak memiliki akses untuk mengubah coffee shop ini' })

    const { openingHours: openingHoursInput, openingHourEntries: entriesInput, ...shopData } = parsed.data
    const data: any = { ...shopData }
    if (data.name && data.name !== shop.name) {
      data.slug = await uniqueSlug(data.name)
    }

    const imageUrl = await uploadToCloudinaryIfNeeded(request.file)
    if (imageUrl) {
      await prisma.coffeeShopImage.create({
        data: {
          coffeeShopId: shop.id,
          imageUrl,
        },
      })
    }

    let updated
    if (entriesInput) {
      const entries = entriesInput.map(entryFromInput)
      const summary = buildOpeningHoursSummary(entries)
      updated = await prisma.$transaction(async (tx) => {
        await tx.openingHour.deleteMany({ where: { coffeeShopId: shop.id } })
        await tx.openingHour.createMany({
          data: entries.map((entry) => ({ ...entry, coffeeShopId: shop.id })),
        })
        return tx.coffeeShop.update({
          where: { id: shop.id },
          data: { ...data, openingHours: summary },
          include: { images: true, openingHourEntries: openingHourEntriesInclude },
        })
      })
    } else {
      if (openingHoursInput) data.openingHours = openingHoursInput
      updated = await prisma.coffeeShop.update({
        where: { id: shop.id },
        data,
        include: { images: true, openingHourEntries: openingHourEntriesInclude },
      })
    }

    return response.json({ success: true, data: withSchedule(updated) })
  } catch (error) { return next(error) }
})

coffeeShopRouter.delete('/:id', authenticate, authorize('OWNER', 'ADMIN'), async (request: AuthenticatedRequest, response, next) => {
  try {
    const { shop, forbidden } = await findOwnedShop(request.params.id, request)
    if (!shop) return response.status(404).json({ success: false, message: 'Coffee shop tidak ditemukan' })
    if (forbidden) return response.status(403).json({ success: false, message: 'Anda tidak memiliki akses untuk menghapus coffee shop ini' })

    await prisma.coffeeShop.delete({ where: { id: shop.id } })
    return response.status(204).send()
  } catch (error) { return next(error) }
})

coffeeShopRouter.put('/:id/taxonomy', authenticate, authorize('OWNER', 'ADMIN'), async (request: AuthenticatedRequest, response, next) => {
  try {
    const parsed = assignRefs.safeParse(request.body)
    if (!parsed.success) return response.status(400).json({ success: false, message: 'Data kategori/fasilitas tidak valid', errors: parsed.error.flatten().fieldErrors })

    const { shop, forbidden } = await findOwnedShop(request.params.id, request)
    if (!shop) return response.status(404).json({ success: false, message: 'Coffee shop tidak ditemukan' })
    if (forbidden) return response.status(403).json({ success: false, message: 'Anda tidak memiliki akses untuk mengubah coffee shop ini' })

    const { categoryIds, facilityIds } = parsed.data

    await prisma.$transaction([
      ...(categoryIds ? [
        prisma.coffeeShopCategory.deleteMany({ where: { coffeeShopId: shop.id } }),
        prisma.coffeeShopCategory.createMany({ data: categoryIds.map(categoryId => ({ coffeeShopId: shop.id, categoryId })) }),
      ] : []),
      ...(facilityIds ? [
        prisma.coffeeShopFacility.deleteMany({ where: { coffeeShopId: shop.id } }),
        prisma.coffeeShopFacility.createMany({ data: facilityIds.map(facilityId => ({ coffeeShopId: shop.id, facilityId })) }),
      ] : []),
    ])

    const updated = await prisma.coffeeShop.findUnique({
      where: { id: shop.id },
      include: { categories: { include: { category: true } }, facilities: { include: { facility: true } } },
    })
    return response.json({ success: true, data: updated })
  } catch (error) { return next(error) }
})

function toCard(shop: Prisma.CoffeeShopGetPayload<{ include: typeof cardInclude }>) {
  const effective = getEffectiveRating(shop)
  return {
    id: shop.id,
    name: shop.name,
    slug: shop.slug,
    district: shop.district,
    priceRange: shop.priceRange,
    isFeatured: shop.isFeatured,
    status: shop.status,
    openingHours: shop.openingHours,
    openingHourEntries: entriesToResponse(shop.openingHourEntries),
    openStatus: getOpenStatus({
      status: shop.status,
      openingHourEntries: shop.openingHourEntries,
      openingHours: shop.openingHours,
    }),
    image: shop.images[0]?.imageUrl ?? null,
    facilities: shop.facilities.map(item => item.facility),
    rating: effective.rating,
    reviewCount: effective.reviewCount,
    ratingSource: effective.ratingSource,
  }
}