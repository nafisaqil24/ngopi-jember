import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import fs from 'fs'
import path from 'path'

// Regresi: /uploads harus tetap disajikan walaupun NODE_ENV=production.
// Sebelum perbaikan, middleware static /uploads hanya aktif saat !isProduction,
// sehingga gambar hasil upload lokal menjadi 404 di mode production.
const probeName = '__uploads_probe__.txt'
const probeContent = 'uploads-probe-ok'
const uploadsDir = path.join(process.cwd(), 'uploads')
const probePath = path.join(uploadsDir, probeName)

describe('/uploads static serving (production mode)', () => {
  let app: import('express').Express

  beforeAll(async () => {
    // Simulasikan production sebelum app.ts di-import (isProduction dihitung saat load).
    // Cloudinary dummy agar upload.ts tidak melempar error wajib-konfigurasi.
    process.env.NODE_ENV = 'production'
    process.env.CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || 'dummy'
    process.env.CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY || 'dummy'
    process.env.CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET || 'dummy'

    fs.mkdirSync(uploadsDir, { recursive: true })
    fs.writeFileSync(probePath, probeContent)

    ;({ app } = await import('./app.js'))
  })

  afterAll(() => {
    try {
      fs.unlinkSync(probePath)
    } catch {
      /* diamkan bila sudah terhapus */
    }
  })

  it('melayani GET /uploads/<file> dengan 200 dan isi file (bukan HTML/404)', async () => {
    const res = await request(app).get(`/uploads/${probeName}`)
    expect(res.status).toBe(200)
    expect(res.text).toBe(probeContent)
  })
})