import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import path from 'path'
import fs from 'fs'
import { authRouter } from './routes/auth.routes.js'
import { coffeeShopRouter } from './routes/coffee-shop.routes.js'
import { ownerRouter } from './routes/owner.routes.js'
import { adminRouter } from './routes/admin.routes.js'
import { referenceRouter } from './routes/reference.routes.js'
import { notFoundHandler, errorHandler } from './middleware/errorHandler.js'

export const app = express()

// CSP: pertahankan direktif default helmet, hanya perluas img-src agar gambar
// eksternal (Cloudinary) dan hero Unsplash tidak diblokir. Directive lain tidak diubah.
app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      imgSrc: ["'self'", 'data:', 'blob:', 'https://res.cloudinary.com', 'https://images.unsplash.com'],
    },
  },
}))

// Trust proxy untuk rate limiter & IP client di balik proxy (nginx, Railway, Fly, dll)
const trustProxyEnv = process.env.TRUST_PROXY
const trustProxyVal = trustProxyEnv
  ? (isNaN(Number(trustProxyEnv)) ? trustProxyEnv : Number(trustProxyEnv))
  : process.env.NODE_ENV === 'production' ? 1 : 0
app.set('trust proxy', trustProxyVal)

// CORS: production hanya izinkan CLIENT_URL (comma-separated), tanpa wildcard tunnel
const isProduction = process.env.NODE_ENV === 'production'
const allowedOrigins = isProduction
  ? (process.env.CLIENT_URL || '').split(',').map(s => s.trim()).filter(Boolean)
  : ['http://localhost:5173', 'http://localhost:3000']

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true)
    if (!isProduction) return callback(null, true)
    if (allowedOrigins.includes(origin)) return callback(null, true)
    return callback(new Error('Not allowed by CORS'))
  },
  credentials: true,
}))
app.use(express.json())

// Static uploads: disajikan di semua environment sebagai fallback ketika
// Cloudinary tidak dikonfigurasi (mis. dev lokal atau server tanpa Cloudinary).
// CATATAN PRODUKSI: sebaiknya pakai Cloudinary untuk hosting sungguhan karena
// disk pada sebagian besar free host bersifat ephemeral (file hilang saat redeploy).
const uploadsDir = path.join(process.cwd(), 'uploads')
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true })
}
app.use('/uploads', express.static(uploadsDir, {
  // Override header global helmet (CORP: same-origin) HANYA untuk aset upload,
  // agar tetap bisa dimuat bila frontend & backend berada di origin berbeda
  // (mis. frontend Vercel + backend Render). Origin lain tetap dibatasi CORS.
  setHeaders: (res) => res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin'),
}))

app.get('/api/health', (_request, response) => response.json({ success: true, data: { status: 'ok' } }))
app.use('/api/auth', authRouter)
app.use('/api/coffee-shops', coffeeShopRouter)
app.use('/api/owner', ownerRouter)
app.use('/api/admin', adminRouter)
app.use('/api', referenceRouter)

// 404 JSON untuk endpoint API yang tidak dikenal (konsisten walau frontend belum di-build)
app.use('/api', (_req, res) => {
  return res.status(404).json({ success: false, message: 'Endpoint tidak ditemukan' })
})

// Static frontend (SPA) — dipakai di production setelah build.
// Path dihitung relatif terhadap lokasi file terkompilasi (dist/app.js -> <root>/frontend/dist),
// sehingga tetap benar walau server dijalankan dari root repo.
const frontendDist = process.env.FRONTEND_DIST_PATH
  ? path.resolve(process.env.FRONTEND_DIST_PATH)
  : path.resolve(__dirname, '../../frontend/dist')
const frontendIndex = path.join(frontendDist, 'index.html')
const hasFrontend = fs.existsSync(frontendDist) && fs.existsSync(frontendIndex)

if (hasFrontend) {
  app.use(express.static(frontendDist))

  // Fallback SPA hanya untuk GET, bukan /api/*, dan path tanpa ekstensi file.
  // Request file statis yang tidak ada akan jatuh ke 404, bukan index.html.
  app.get(/^(?!\/api(?:\/|$)).*/, (req, res, next) => {
    if (path.extname(req.path)) return next()
    res.sendFile(frontendIndex, (err) => {
      if (err) next(err)
    })
  })
} else {
  console.warn(
    `[frontend] Peringatan: frontend tidak disajikan - folder build tidak ditemukan di "${frontendDist}" ` +
    `(atau index.html tidak ada). Jalankan build frontend atau set FRONTEND_DIST_PATH.`,
  )
}

app.use(notFoundHandler)
app.use(errorHandler)
