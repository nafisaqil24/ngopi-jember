import 'dotenv/config'
import { app } from './app.js'

const isProduction = process.env.NODE_ENV === 'production'

if (isProduction) {
  const missing: string[] = []
  if (!process.env.DATABASE_URL) missing.push('DATABASE_URL')
  if (!process.env.DIRECT_URL) missing.push('DIRECT_URL')
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) missing.push('JWT_SECRET (min 32 chars)')
  if (!process.env.CLIENT_URL) missing.push('CLIENT_URL')
  if (!process.env.CLOUDINARY_CLOUD_NAME) missing.push('CLOUDINARY_CLOUD_NAME')
  if (!process.env.CLOUDINARY_API_KEY) missing.push('CLOUDINARY_API_KEY')
  if (!process.env.CLOUDINARY_API_SECRET) missing.push('CLOUDINARY_API_SECRET')

  if (missing.length > 0) {
    console.error('FATAL: Variabel lingkungan berikut wajib diisi di production:')
    missing.forEach((v) => console.error(` - ${v}`))
    process.exit(1)
  }
}

const port = Number(process.env.PORT ?? 4000)
app.listen(port, () => console.log(`Ngopi Jember API berjalan di http://localhost:${port}`))
