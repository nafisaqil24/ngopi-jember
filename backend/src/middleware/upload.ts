import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { v2 as cloudinary } from 'cloudinary'

const isProduction = process.env.NODE_ENV === 'production'

const uploadDir = path.join(process.cwd(), 'uploads')
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true })
}

const isCloudinaryConfigured = Boolean(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
)

if (isProduction && !isCloudinaryConfigured) {
  throw new Error('FATAL: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET wajib diisi di production')
}

if (isCloudinaryConfigured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  })
}

const diskStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir)
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9)
    cb(null, uniqueSuffix + path.extname(file.originalname))
  },
})

const memoryStorage = multer.memoryStorage()

export const upload = multer({
  storage: isProduction ? memoryStorage : (isCloudinaryConfigured ? memoryStorage : diskStorage),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true)
    } else {
      cb(new Error('Hanya file gambar yang diperbolehkan!'))
    }
  },
})

export async function uploadToCloudinaryIfNeeded(file?: Express.Multer.File & { filename?: string }): Promise<string | null> {
  if (!file) return null
  if (!isCloudinaryConfigured) {
    if (file.filename) return `/uploads/${file.filename}`
    return null
  }

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: 'ngopi-jember' },
      (error, result) => {
        if (error) return reject(error)
        resolve(result?.secure_url ?? null)
      }
    )
    uploadStream.end(file.buffer)
  })
}
