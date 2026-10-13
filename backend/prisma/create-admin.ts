import { PrismaClient, UserRole } from '@prisma/client'
import { hashPassword } from '../src/utils/password.js'

const prisma = new PrismaClient()

function validateEnv(): { email: string; name: string; password: string } {
  const email = process.env.ADMIN_EMAIL || process.env.SEED_ADMIN_EMAIL
  const name = process.env.ADMIN_NAME || process.env.SEED_ADMIN_NAME
  const password = process.env.ADMIN_PASSWORD || process.env.SEED_ADMIN_PASSWORD

  const missing: string[] = []
  if (!email) missing.push('ADMIN_EMAIL')
  if (!name) missing.push('ADMIN_NAME')
  if (!password) missing.push('ADMIN_PASSWORD')

  if (missing.length > 0) {
    throw new Error(`ENV wajib tidak di-set: ${missing.join(', ')}. Isi di .env sebelum menjalankan script.`)
  }
  return {
    email: email!,
    name: name!,
    password: password!,
  }
}

async function main() {
  const { email, name, password } = validateEnv()

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    console.log(`⚠️  Admin ${email} sudah ada, lewati pembuatan`)
    return
  }

  const hashed = await hashPassword(password)
  const admin = await prisma.user.create({
    data: { email, name, password: hashed, role: UserRole.ADMIN },
    select: { id: true, email: true, name: true, role: true },
  })

  console.log('✅ Admin dibuat:', admin)
}

main()
  .catch((e) => {
    console.error('❌ Gagal membuat admin:', e.message)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
