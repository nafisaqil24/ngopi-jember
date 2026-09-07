import { Prisma } from '@prisma/client'
import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { authenticate, authorize, type AuthenticatedRequest } from '../middleware/auth.js'
import { menuRouter } from './menu.routes.js'

export const coffeeShopRouter = Router()

coffeeShopRouter.use('/:coffeeShopId/menus', menuRouter)

const listQuery = z.object({
  search: z.string().trim().max(100).optional(),
  district: z.string().trim().max(80).optional(),
  minRating: z.coerce.number().min(1).max(5).optional(),
  facility: z.string().trim().max(80).optional(),
  featured: z.enum(['true', 'false']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
})

const createShop = z.object({
  name: z.string().trim().min(3).max(120),
  description: z.string().trim().min(10).max(2000),
  address: z.string().trim().min(5).max(200),
  district: z.string().trim().min(2).max(80),
  priceRange: z.string().trim().min(1).max(50),
  openingHours: z.string().trim().min(1).max(200),
  phone: z.string().trim().max(30).optional(),
  instagram: z.string().trim().max(200).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
})

const updateShop = createShop.partial()

const assignRefs = z.object({
  categoryIds: z.array(z.string().cuid()).optional(),
  facilityIds: z.array(z.string().cuid()).optional(),
})

const cardInclude = {
  facilities: { include: { facility: true } },
  images: { take: 1, orderBy: { createdAt: 'asc' as const } },
  reviews: { select: { rating: true } },
  _count: { select: { reviews: true } },
} satisfies Prisma.CoffeeShopInclude

function slugify(name: string) {
  return name.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-')
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
    const { search, district, minRating, facility, featured, page, limit } = parsed.data
    const where: Prisma.CoffeeShopWhereInput = {
      ...(search ? { OR: [{ name: { contains: search, mode: 'insensitive' } }, { district: { contains: search, mode: 'insensitive' } }] } : {}),
      ...(district ? { district: { equals: district, mode: 'insensitive' } } : {}),
      ...(featured ? { isFeatured: featured === 'true' } : {}),
      ...(facility ? { facilities: { some: { facility: { slug: facility } } } } : {}),
    }
    const [shops, total] = await prisma.$transaction([
      prisma.coffeeShop.findMany({ where, include: cardInclude, orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }], skip: (page - 1) * limit, take: limit }),
      prisma.coffeeShop.count({ where }),
    ])
    const results = shops.filter(shop => !minRating || shop.reviews.length === 0 || shop.reviews.reduce((totalRating, review) => totalRating + review.rating, 0) / shop.reviews.length >= minRating)
    return response.json({ success: true, data: results.map(toCard), meta: { page, limit, total, totalPages: Math.ceil(total / limit) } })
  } catch (error) { return next(error) }
})

coffeeShopRouter.get('/:slug', async (request, response, next) => {
  try {
    const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).safeParse(request.params.slug)
    if (!slug.success) return response.status(400).json({ success: false, message: 'Slug coffee shop tidak valid' })
    const shop = await prisma.coffeeShop.findUnique({ where: { slug: slug.data }, include: { categories: { include: { category: true } }, facilities: { include: { facility: true } }, images: { orderBy: { createdAt: 'asc' } }, menus: { orderBy: { createdAt: 'asc' } }, promotions: { where: { isActive: true }, orderBy: { createdAt: 'desc' } }, reviews: { include: { user: { select: { name: true } } }, orderBy: { createdAt: 'desc' } }, subscription: true } })
    if (!shop) return response.status(404).json({ success: false, message: 'Coffee shop tidak ditemukan' })
    const rating = shop.reviews.length ? shop.reviews.reduce((sum, review) => sum + review.rating, 0) / shop.reviews.length : null
    return response.json({ success: true, data: { ...shop, rating, reviewCount: shop.reviews.length } })
  } catch (error) { return next(error) }
})

coffeeShopRouter.post('/', authenticate, authorize('OWNER', 'ADMIN'), async (request: AuthenticatedRequest, response, next) => {
  try {
    const parsed = createShop.safeParse(request.body)
    if (!parsed.success) return response.status(400).json({ success: false, message: 'Data coffee shop tidak valid', errors: parsed.error.flatten().fieldErrors })

    const slug = await uniqueSlug(parsed.data.name)
    const shop = await prisma.coffeeShop.create({
      data: { ...parsed.data, slug, ownerId: request.auth!.userId },
    })
    return response.status(201).json({ success: true, data: shop })
  } catch (error) { return next(error) }
})

coffeeShopRouter.put('/:id', authenticate, authorize('OWNER', 'ADMIN'), async (request: AuthenticatedRequest, response, next) => {
  try {
    const parsed = updateShop.safeParse(request.body)
    if (!parsed.success) return response.status(400).json({ success: false, message: 'Data coffee shop tidak valid', errors: parsed.error.flatten().fieldErrors })

    const { shop, forbidden } = await findOwnedShop(request.params.id, request)
    if (!shop) return response.status(404).json({ success: false, message: 'Coffee shop tidak ditemukan' })
    if (forbidden) return response.status(403).json({ success: false, message: 'Anda tidak memiliki akses untuk mengubah coffee shop ini' })

    const data = { ...parsed.data }
    if (data.name && data.name !== shop.name) {
      Object.assign(data, { slug: await uniqueSlug(data.name) })
    }

    const updated = await prisma.coffeeShop.update({ where: { id: shop.id }, data })
    return response.json({ success: true, data: updated })
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
  const rating = shop.reviews.length ? shop.reviews.reduce((sum, review) => sum + review.rating, 0) / shop.reviews.length : null
  return { id: shop.id, name: shop.name, slug: shop.slug, district: shop.district, priceRange: shop.priceRange, isFeatured: shop.isFeatured, status: shop.status, image: shop.images[0]?.imageUrl ?? null, facilities: shop.facilities.map(item => item.facility), rating, reviewCount: shop._count.reviews }
}