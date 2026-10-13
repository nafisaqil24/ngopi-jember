import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const CATEGORIES = [
  'Specialty Coffee',
  'Kopi Tradisional',
  'Kopi Susu Kekinian',
  'Cocok Buat WFH / Belajar',
  'Tempat Nongkrong',
  'Outdoor / Garden',
  'Live Music',
] as const

const FACILITIES = [
  'WiFi',
  'Colokan Listrik',
  'AC',
  'Smoking Area',
  'Non-Smoking Area',
  'Parkir Motor',
  'Parkir Mobil',
  'Musala',
  'Toilet',
  'Outdoor Seating',
  'Bisa Reservasi',
  'Buka 24 Jam',
] as const

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s/]+/g, '-')
    .replace(/-+/g, '-')
}

async function upsertCategories() {
  console.log('📦 Upsert Category...')
  for (const name of CATEGORIES) {
    const slug = slugify(name)
    await prisma.category.upsert({
      where: { slug },
      update: { name },
      create: { name, slug },
    })
  }
  const count = await prisma.category.count()
  console.log(`   ${count} kategori`)
}

async function upsertFacilities() {
  console.log('📦 Upsert Facility...')
  for (const name of FACILITIES) {
    const slug = slugify(name)
    await prisma.facility.upsert({
      where: { slug },
      update: { name },
      create: { name, slug },
    })
  }
  const count = await prisma.facility.count()
  console.log(`   ${count} fasilitas`)
}

async function main() {
  console.log('🌱 Production seed: reference data only (categories & facilities)')
  await upsertCategories()
  await upsertFacilities()
  console.log('✅ Production seed selesai')
}

main()
  .catch((e) => {
    console.error('❌ Seed gagal:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
