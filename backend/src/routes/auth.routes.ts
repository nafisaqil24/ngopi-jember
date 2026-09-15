import { UserRole } from '@prisma/client'
import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { z } from 'zod'
import { authenticate, type AuthenticatedRequest } from '../middleware/auth.js'
import { prisma } from '../lib/prisma.js'
import { comparePassword, hashPassword } from '../utils/password.js'
import { createAccessToken } from '../utils/jwt.js'

export const authRouter = Router()

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Terlalu banyak percobaan, coba lagi nanti',
  },
})

const credentials = z.object({
  email: z.string().trim().email().max(254).transform(value => value.toLowerCase()),
  password: z.string().min(8).max(128),
})
const registration = credentials.extend({
  name: z.string().trim().min(2).max(80),
  role: z.enum([UserRole.USER, UserRole.OWNER]).default(UserRole.USER),
})

const publicUser = (user: { id: string; name: string; email: string; role: UserRole; createdAt: Date }) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  createdAt: user.createdAt,
})

authRouter.post('/register', authLimiter, async (request, response, next) => {
  try {
    const parsed = registration.safeParse(request.body)
    if (!parsed.success) return response.status(400).json({ success: false, message: 'Data pendaftaran tidak valid', errors: parsed.error.flatten().fieldErrors })

    const exists = await prisma.user.findUnique({ where: { email: parsed.data.email }, select: { id: true } })
    if (exists) return response.status(409).json({ success: false, message: 'Email sudah terdaftar' })

    const user = await prisma.user.create({
      data: { ...parsed.data, password: await hashPassword(parsed.data.password) },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    })
    const token = createAccessToken({ userId: user.id, role: user.role })
    return response.status(201).json({ success: true, data: { user: publicUser(user), token } })
  } catch (error) { return next(error) }
})

authRouter.post('/login', authLimiter, async (request, response, next) => {
  try {
    const parsed = credentials.safeParse(request.body)
    if (!parsed.success) return response.status(400).json({ success: false, message: 'Email atau password tidak valid' })

    const user = await prisma.user.findUnique({ where: { email: parsed.data.email } })
    if (!user || !(await comparePassword(parsed.data.password, user.password))) return response.status(401).json({ success: false, message: 'Email atau password salah' })

    const token = createAccessToken({ userId: user.id, role: user.role })
    return response.json({ success: true, data: { user: publicUser(user), token } })
  } catch (error) { return next(error) }
})

authRouter.get('/me', authenticate, async (request: AuthenticatedRequest, response, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: request.auth!.userId }, select: { id: true, name: true, email: true, role: true, createdAt: true } })
    if (!user) return response.status(404).json({ success: false, message: 'Pengguna tidak ditemukan' })
    return response.json({ success: true, data: publicUser(user) })
  } catch (error) { return next(error) }
})
