import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { authenticate, authorize, type AuthenticatedRequest } from '../middleware/auth.js'

export const menuRouter = Router({ mergeParams: true })

const menuInput = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(500).optional(),
  price: z.number().int().min(0),
  image: z.string().trim().url().optional(),
})

// Helper kecil buat "meratakan" nilai request.params yang tipenya
// bisa string ATAU string[] (bawaan Express 5) jadi string tunggal.
function toParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

async function findOwnedShop(id: string | string[] | undefined, request: AuthenticatedRequest) {
  const shopId = toParam(id)
  const shop = await prisma.coffeeShop.findUnique({ where: { id: shopId } })
  if (!shop) return { shop: null, forbidden: false }

  const isOwner = shop.ownerId === request.auth!.userId
  const isAdmin = request.auth!.role === 'ADMIN'

  return { shop, forbidden: !isOwner && !isAdmin }
}

// GET /api/coffee-shops/:coffeeShopId/menus
menuRouter.get<{ coffeeShopId: string }, any, any, any, any>('/', async (request, response, next) => {
  try {
    const coffeeShopId = toParam(request.params.coffeeShopId)
    const menus = await prisma.menu.findMany({
      where: { coffeeShopId },
      orderBy: { createdAt: 'asc' },
    })
    return response.json({ success: true, data: menus })
  } catch (error) { return next(error) }
})

// POST /api/coffee-shops/:coffeeShopId/menus
menuRouter.post('/', authenticate, authorize('OWNER', 'ADMIN'), async (request: AuthenticatedRequest, response, next) => {
  try {
    const parsed = menuInput.safeParse(request.body)
    if (!parsed.success) return response.status(400).json({ success: false, message: 'Data menu tidak valid', errors: parsed.error.flatten().fieldErrors })

    const { shop, forbidden } = await findOwnedShop(request.params.coffeeShopId, request)
    if (!shop) return response.status(404).json({ success: false, message: 'Coffee shop tidak ditemukan' })
    if (forbidden) return response.status(403).json({ success: false, message: 'Anda tidak memiliki akses untuk mengelola menu coffee shop ini' })

    const menu = await prisma.menu.create({ data: { ...parsed.data, coffeeShopId: shop.id } })
    return response.status(201).json({ success: true, data: menu })
  } catch (error) { return next(error) }
})

// PUT /api/coffee-shops/:coffeeShopId/menus/:menuId
menuRouter.put('/:menuId', authenticate, authorize('OWNER', 'ADMIN'), async (request: AuthenticatedRequest, response, next) => {
  try {
    const parsed = menuInput.partial().safeParse(request.body)
    if (!parsed.success) return response.status(400).json({ success: false, message: 'Data menu tidak valid', errors: parsed.error.flatten().fieldErrors })

    const { shop, forbidden } = await findOwnedShop(request.params.coffeeShopId, request)
    if (!shop) return response.status(404).json({ success: false, message: 'Coffee shop tidak ditemukan' })
    if (forbidden) return response.status(403).json({ success: false, message: 'Anda tidak memiliki akses untuk mengelola menu coffee shop ini' })

    const menuId = toParam(request.params.menuId)
    const menu = await prisma.menu.findUnique({ where: { id: menuId } })
    if (!menu || menu.coffeeShopId !== shop.id) {
      return response.status(404).json({ success: false, message: 'Menu tidak ditemukan' })
    }

    const updated = await prisma.menu.update({ where: { id: menu.id }, data: parsed.data })
    return response.json({ success: true, data: updated })
  } catch (error) { return next(error) }
})

// DELETE /api/coffee-shops/:coffeeShopId/menus/:menuId
menuRouter.delete('/:menuId', authenticate, authorize('OWNER', 'ADMIN'), async (request: AuthenticatedRequest, response, next) => {
  try {
    const { shop, forbidden } = await findOwnedShop(request.params.coffeeShopId, request)
    if (!shop) return response.status(404).json({ success: false, message: 'Coffee shop tidak ditemukan' })
    if (forbidden) return response.status(403).json({ success: false, message: 'Anda tidak memiliki akses untuk mengelola menu coffee shop ini' })

    const menuId = toParam(request.params.menuId)
    const menu = await prisma.menu.findUnique({ where: { id: menuId } })
    if (!menu || menu.coffeeShopId !== shop.id) {
      return response.status(404).json({ success: false, message: 'Menu tidak ditemukan' })
    }

    await prisma.menu.delete({ where: { id: menu.id } })
    return response.status(204).send()
  } catch (error) { return next(error) }
})