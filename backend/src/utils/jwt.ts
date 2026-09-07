import { type UserRole } from '@prisma/client'
import jwt, { type JwtPayload } from 'jsonwebtoken'

export type TokenPayload = JwtPayload & { userId: string; role: UserRole }

function secret() {
  const value = process.env.JWT_SECRET
  if (!value || value.length < 32) throw new Error('JWT_SECRET harus diisi dengan string acak minimal 32 karakter')
  return value
}

export const createAccessToken = (payload: Pick<TokenPayload, 'userId' | 'role'>) =>
  jwt.sign(payload, secret(), { expiresIn: '7d' })

export function readAccessToken(token: string): TokenPayload {
  const decoded = jwt.verify(token, secret())
  if (typeof decoded === 'string' || !decoded.userId || !decoded.role) throw new Error('Token tidak valid')
  return decoded as TokenPayload
}
