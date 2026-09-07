import { Router } from 'express'
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
        images: { orderBy: { createdAt: 'asc' } },
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
// Ringkasan statistik untuk dashboard: jumlah tiap jenis AnalyticsEvent
// (profile view, klik Maps/WA/IG, menu view), plus jumlah review dan
// rating rata-rata. Dihitung langsung dari database tiap request --
// untuk skala project ini belum perlu caching.
ownerRouter.get('/analytics', async (request: AuthenticatedRequest, response, next) => {
  try {
    const shop = await prisma.coffeeShop.findFirst({ where: { ownerId: request.auth!.userId }, select: { id: true } })
    if (!shop) return response.status(404).json({ success: false, message: 'Anda belum memiliki coffee shop terdaftar' })

    const [eventCounts, reviewAgg] = await prisma.$transaction([
      prisma.analyticsEvent.groupBy({
        by: ['eventType'],
        where: { coffeeShopId: shop.id },
        _count: { _all: true },
        orderBy: { eventType: 'asc' },
      }),
      prisma.review.aggregate({
        where: { coffeeShopId: shop.id },
        _count: { _all: true },
        _avg: { rating: true },
      }),
    ])

    // eventCounts dari Prisma bentuknya array [{ eventType: 'PROFILE_VIEW', _count: { _all: 5 } }, ...]
    // kita ratakan jadi object { PROFILE_VIEW: 5, MAP_CLICK: 2, ... } biar gampang dipakai di frontend.
    const events = Object.fromEntries(eventCounts.map(item => [item.eventType, (item._count as any)._all]))

    return response.json({
      success: true,
      data: {
        profileViews: events.PROFILE_VIEW ?? 0,
        mapClicks: events.MAP_CLICK ?? 0,
        whatsappClicks: events.WHATSAPP_CLICK ?? 0,
        instagramClicks: events.INSTAGRAM_CLICK ?? 0,
        menuViews: events.MENU_VIEW ?? 0,
        promotionViews: events.PROMOTION_VIEW ?? 0,
        reviewCount: reviewAgg._count._all,
        averageRating: reviewAgg._avg.rating,
      },
    })
  } catch (error) { return next(error) }
})