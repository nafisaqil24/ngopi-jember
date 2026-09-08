import cors from 'cors'
import express, { type NextFunction, type Request, type Response } from 'express'
import path from 'path'
import { authRouter } from './routes/auth.routes.js'
import { coffeeShopRouter } from './routes/coffee-shop.routes.js'
import { ownerRouter } from './routes/owner.routes.js'
import { referenceRouter } from './routes/reference.routes.js'

export const app = express()

const allowedOrigins = (process.env.CLIENT_URL ?? 'http://localhost:5173').split(',').map(s => s.trim())
if (!allowedOrigins.includes('http://localhost:5173')) allowedOrigins.push('http://localhost:5173')
if (!allowedOrigins.includes('http://localhost:3000')) allowedOrigins.push('http://localhost:3000')

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true)
    const isAllowed = allowedOrigins.includes(origin) ||
                      origin.endsWith('.devtunnels.ms') ||
                      origin.endsWith('.githubpreview.dev') ||
                      origin.endsWith('.gitpod.io')
    if (isAllowed) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  }
}))
app.use(express.json())
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')))

app.get('/api/health', (_request, response) => response.json({ success: true, data: { status: 'ok' } }))
app.use('/api/auth', authRouter)
app.use('/api/coffee-shops', coffeeShopRouter)
app.use('/api/owner', ownerRouter)
app.use('/api', referenceRouter)

app.use((_request, response) => response.status(404).json({ success: false, message: 'Endpoint tidak ditemukan' }))
app.use((error: Error, _request: Request, response: Response, _next: NextFunction) => {
  console.error(error)
  response.status(500).json({ success: false, message: 'Terjadi kesalahan pada server' })
})
