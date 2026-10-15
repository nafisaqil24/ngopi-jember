import { AnalyticsEventType } from '@prisma/client'
import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { authenticate, authorize, type AuthenticatedRequest } from '../middleware/auth.js'

export const ownerRouter = Router()

// Semua route di file ini WAJIB login sebagai OWNER. Ditulis sekali di
// sini (bukan diulang di tiap route seperti di coffee-shop.routes.ts)
// karena semua endpoint owner memang selalu butuh keduanya.
ownerRouter.use(authenticate, authorize('OWNER'))

// GET /api/owner/coffee-shop
// Mengambil coffee shop milik owner yang sedang login. Asumsi saat ini:
// satu akun OWNER = satu coffee shop (sesuai alur register & create
// shop yang sudah ada). Kalau owner belum pernah bikin coffee shop,
// data-nya null -- frontend nanti tampilkan ajakan "Daftarkan coffee
// shop kamu".
ownerRouter.get('/coffee-shop', async (request: AuthenticatedRequest, response, next) => {
  try {
    const shop = await prisma.coffeeShop.findFirst({
      where: { ownerId: request.auth!.userId },
      include: {
        categories: { include: { category: true } },
        facilities: { include: { facility: true } },
        images: { orderBy: { createdAt: 'desc' } },
        reviews: { select: { rating: true } },
        menus: { orderBy: { createdAt: 'asc' } },
      },
    })
    if (!shop) return response.json({ success: true, data: null })

    const rating = shop.reviews.length
      ? shop.reviews.reduce((sum, review) => sum + review.rating, 0) / shop.reviews.length
      : null

    return response.json({ success: true, data: { ...shop, rating, reviewCount: shop.reviews.length } })
  } catch (error) { return next(error) }
})

// GET /api/owner/analytics
// Ringkasan statistik untuk dashboard owner. Hanya menghitung kedai milik
// owner yang sedang login. Query opsional ?days=7 atau ?days=30 (default 30).
// Mengembalikan jumlah per eventType (SEMUA tipe, termasuk yang bernilai 0)
// supaya frontend tidak perlu menambal tipe yang kosong.
const analyticsQuery = z.object({
  days: z.coerce.number().int().refine((value) => value === 7 || value === 30, {
    message: 'Rentang hari hanya boleh 7 atau 30',
  }).default(30),
})

ownerRouter.get('/analytics', async (request: AuthenticatedRequest, response, next) => {
  try {
    const parsed = analyticsQuery.safeParse(request.query)
    if (!parsed.success) return response.status(400).json({ success: false, message: 'Parameter rentang hari tidak valid', errors: parsed.error.flatten().fieldErrors })

    const days = parsed.data.days
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

    const shop = await prisma.coffeeShop.findFirst({ where: { ownerId: request.auth!.userId }, select: { id: true } })
    if (!shop) return response.status(404).json({ success: false, message: 'Anda belum memiliki coffee shop terdaftar' })

    const [eventCounts, reviewAgg] = await prisma.$transaction([
      prisma.analyticsEvent.groupBy({
        by: ['eventType'],
        where: { coffeeShopId: shop.id, createdAt: { gte: since } },
        _count: { _all: true },
        orderBy: { eventType: 'asc' },
      }),
      prisma.review.aggregate({
        where: { coffeeShopId: shop.id },
        _count: { _all: true },
        _avg: { rating: true },
      }),
    ])

    const counted = Object.fromEntries(eventCounts.map(item => [item.eventType, (item._count as any)._all]))

    // Bangun daftar semua tipe event, isi 0 untuk tipe yang belum ada.
    const events = Object.values(AnalyticsEventType).map(eventType => ({
      eventType,
      count: counted[eventType] ?? 0,
    }))
    const total = events.reduce((sum, item) => sum + item.count, 0)

    return response.json({
      success: true,
      data: {
        days,
        since,
        total,
        events,
        reviewCount: reviewAgg._count._all,
        averageRating: reviewAgg._avg.rating,
      },
    })
  } catch (error) { return next(error) }
})