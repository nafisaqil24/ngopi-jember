import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { authenticate, authorize, type AuthenticatedRequest } from '../middleware/auth.js'

export const adminRouter = Router()

// Semua endpoint di router ini wajib autentikasi dan ber-role ADMIN
adminRouter.use(authenticate, authorize('ADMIN'))

const verifyShopSchema = z.object({
  isVerified: z.boolean(),
})

const featuredShopSchema = z.object({
  isFeatured: z.boolean(),
})

const updateRoleSchema = z.object({
  role: z.enum(['USER', 'OWNER', 'ADMIN']),
})

function toParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

// GET /api/admin/coffee-shops - Daftar semua coffee shop untuk moderasi admin
adminRouter.get('/coffee-shops', async (_request, response, next) => {
  try {
    const shops = await prisma.coffeeShop.findMany({
      include: {
        owner: { select: { id: true, name: true, email: true } },
        _count: { select: { reviews: true, menus: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
    return response.json({ success: true, data: shops })
  } catch (error) {
    return next(error)
  }
})

// PATCH /api/admin/coffee-shops/:id/verify - Verifikasi atau batalkan verifikasi coffee shop
adminRouter.patch('/coffee-shops/:id/verify', async (request: AuthenticatedRequest, response, next) => {
  try {
    const parsed = verifyShopSchema.safeParse(request.body)
    if (!parsed.success) {
      return response.status(400).json({ success: false, message: 'Status verifikasi tidak valid', errors: parsed.error.flatten().fieldErrors })
    }

    const id = toParam(request.params.id)
    if (!id) return response.status(400).json({ success: false, message: 'ID coffee shop tidak valid' })

    const shop = await prisma.coffeeShop.findUnique({ where: { id } })
    if (!shop) {
      return response.status(404).json({ success: false, message: 'Coffee shop tidak ditemukan' })
    }

    const updated = await prisma.coffeeShop.update({
      where: { id },
      data: { isVerified: parsed.data.isVerified },
    })

    return response.json({ success: true, data: updated })
  } catch (error) {
    return next(error)
  }
})

// PATCH /api/admin/coffee-shops/:id/featured - Set atau batalkan status featured coffee shop
adminRouter.patch('/coffee-shops/:id/featured', async (request: AuthenticatedRequest, response, next) => {
  try {
    const parsed = featuredShopSchema.safeParse(request.body)
    if (!parsed.success) {
      return response.status(400).json({ success: false, message: 'Status featured tidak valid', errors: parsed.error.flatten().fieldErrors })
    }

    const id = toParam(request.params.id)
    if (!id) return response.status(400).json({ success: false, message: 'ID coffee shop tidak valid' })

    const shop = await prisma.coffeeShop.findUnique({ where: { id } })
    if (!shop) {
      return response.status(404).json({ success: false, message: 'Coffee shop tidak ditemukan' })
    }

    const updated = await prisma.coffeeShop.update({
      where: { id },
      data: { isFeatured: parsed.data.isFeatured },
    })

    return response.json({ success: true, data: updated })
  } catch (error) {
    return next(error)
  }
})

// DELETE /api/admin/coffee-shops/:id - Hapus coffee shop oleh admin
adminRouter.delete('/coffee-shops/:id', async (request: AuthenticatedRequest, response, next) => {
  try {
    const id = toParam(request.params.id)
    if (!id) return response.status(400).json({ success: false, message: 'ID coffee shop tidak valid' })

    const shop = await prisma.coffeeShop.findUnique({ where: { id } })
    if (!shop) {
      return response.status(404).json({ success: false, message: 'Coffee shop tidak ditemukan' })
    }

    await prisma.coffeeShop.delete({ where: { id } })
    return response.status(204).send()
  } catch (error) {
    return next(error)
  }
})

// GET /api/admin/users - Daftar seluruh pengguna platform
adminRouter.get('/users', async (_request, response, next) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        _count: { select: { coffeeShops: true, reviews: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
    return response.json({ success: true, data: users })
  } catch (error) {
    return next(error)
  }
})

// PATCH /api/admin/users/:id/role - Ubah role pengguna
adminRouter.patch('/users/:id/role', async (request: AuthenticatedRequest, response, next) => {
  try {
    const parsed = updateRoleSchema.safeParse(request.body)
    if (!parsed.success) {
      return response.status(400).json({ success: false, message: 'Role tidak valid', errors: parsed.error.flatten().fieldErrors })
    }

    const id = toParam(request.params.id)
    if (!id) return response.status(400).json({ success: false, message: 'ID pengguna tidak valid' })

    const user = await prisma.user.findUnique({ where: { id } })
    if (!user) {
      return response.status(404).json({ success: false, message: 'Pengguna tidak ditemukan' })
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { role: parsed.data.role },
      select: { id: true, name: true, email: true, role: true, updatedAt: true },
    })

    return response.json({ success: true, data: updated })
  } catch (error) {
    return next(error)
  }
})

// DELETE /api/admin/users/:id - Hapus pengguna
adminRouter.delete('/users/:id', async (request: AuthenticatedRequest, response, next) => {
  try {
    const id = toParam(request.params.id)
    if (!id) return response.status(400).json({ success: false, message: 'ID pengguna tidak valid' })

    const user = await prisma.user.findUnique({ where: { id } })
    if (!user) {
      return response.status(404).json({ success: false, message: 'Pengguna tidak ditemukan' })
    }

    await prisma.user.delete({ where: { id } })
    return response.status(204).send()
  } catch (error) {
    return next(error)
  }
})
