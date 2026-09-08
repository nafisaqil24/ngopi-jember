import type { Request, Response, NextFunction } from 'express'
import { ZodError } from 'zod'
import { Prisma } from '@prisma/client'

export function notFoundHandler(_request: Request, response: Response) {
  return response.status(404).json({
    success: false,
    message: 'Endpoint API tidak ditemukan',
  })
}

export function errorHandler(error: Error, _request: Request, response: Response, _next: NextFunction) {
  console.error('[Error]:', error)

  // 1. Zod Validation Error
  if (error instanceof ZodError) {
    const fieldErrors = error.flatten().fieldErrors as Record<string, string[] | undefined>
    const firstField = Object.keys(fieldErrors)[0]
    const message = firstField && fieldErrors[firstField]?.[0]
      ? `Validasi gagal pada field '${firstField}': ${fieldErrors[firstField]?.[0]}`
      : 'Data yang dikirim tidak valid'

    return response.status(400).json({
      success: false,
      message,
      errors: fieldErrors,
    })
  }

  // 2. Prisma Known Request Errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      const target = (error.meta?.target as string[])?.join(', ') || 'data'
      return response.status(409).json({
        success: false,
        message: `Data dengan ${target} tersebut sudah ada (duplikat).`,
      })
    }
    if (error.code === 'P2025') {
      return response.status(404).json({
        success: false,
        message: 'Data yang diminta tidak ditemukan di database.',
      })
    }
  }

  // 3. General Error
  const statusCode = (error as any).statusCode || 500
  const message = statusCode === 500 && process.env.NODE_ENV === 'production'
    ? 'Terjadi kesalahan pada server'
    : error.message || 'Terjadi kesalahan pada server'

  return response.status(statusCode).json({
    success: false,
    message,
  })
}
