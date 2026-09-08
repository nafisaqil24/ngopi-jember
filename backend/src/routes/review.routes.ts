import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { authenticate, authorize, type AuthenticatedRequest } from '../middleware/auth.js'

export const reviewRouter = Router({ mergeParams: true })

const reviewInput = z.object({
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().trim().min(3).max(1000),
})

function toParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

// POST /api/coffee-shops/:coffeeShopId/reviews
reviewRouter.post('/', authenticate, authorize('USER', 'OWNER', 'ADMIN'), async (request: AuthenticatedRequest, response, next) => {
  try {
    const parsed = reviewInput.safeParse(request.body)
    if (!parsed.success) {
      return response.status(400).json({ success: false, message: 'Data ulasan tidak valid', errors: parsed.error.flatten().fieldErrors })
    }

    const coffeeShopId = toParam(request.params.coffeeShopId)
    const shop = await prisma.coffeeShop.findUnique({ where: { id: coffeeShopId } })
    if (!shop) {
      return response.status(404).json({ success: false, message: 'Coffee shop tidak ditemukan' })
    }

    const userId = request.auth!.userId

    const review = await prisma.review.upsert({
      where: {
        coffeeShopId_userId: {
          coffeeShopId: shop.id,
          userId,
        },
      },
      create: {
        coffeeShopId: shop.id,
        userId,
        rating: parsed.data.rating,
        comment: parsed.data.comment,
      },
      update: {
        rating: parsed.data.rating,
        comment: parsed.data.comment,
      },
      include: {
        user: { select: { name: true } },
      },
    })

    return response.status(201).json({ success: true, data: review })
  } catch (error) {
    return next(error)
  }
})
