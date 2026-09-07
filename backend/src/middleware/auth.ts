import { type UserRole } from '@prisma/client'
import { type NextFunction, type Request, type Response } from 'express'
import { readAccessToken, type TokenPayload } from '../utils/jwt.js'

export type AuthenticatedRequest = Request & { auth?: Pick<TokenPayload, 'userId' | 'role'> }

export function authenticate(request: AuthenticatedRequest, response: Response, next: NextFunction) {
  const [scheme, token] = request.headers.authorization?.split(' ') ?? []
  if (scheme !== 'Bearer' || !token) return response.status(401).json({ success: false, message: 'Token autentikasi diperlukan' })

  try {
    const { userId, role } = readAccessToken(token)
    request.auth = { userId, role }
    return next()
  } catch {
    return response.status(401).json({ success: false, message: 'Token tidak valid atau sudah kedaluwarsa' })
  }
}

export function authorize(...roles: UserRole[]) {
  return (request: AuthenticatedRequest, response: Response, next: NextFunction) => {
    if (!request.auth) return response.status(401).json({ success: false, message: 'Token autentikasi diperlukan' })
    if (!roles.includes(request.auth.role)) return response.status(403).json({ success: false, message: 'Anda tidak memiliki izin untuk aksi ini' })
    return next()
  }
}
