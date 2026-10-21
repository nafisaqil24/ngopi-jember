// =============================================================================
// SEED DATA UJI — SAW / Chatbot (Ngopi Jember)
// -----------------------------------------------------------------------------
// Membuat data uji TERPISAH (owner, reviewer, 5 kedai) untuk menguji metode SAW
// dan chatbot. TIDAK menyentuh data kedai asli.
//
// Keamanan:
//   - SELALU memuat backend/.env.test (override) sebelum PrismaClient diimpor.
//   - MENOLAK jalan bila host DB tujuan sama dengan host di backend/.env (utama).
//   - Default DRY-RUN; hanya menulis dengan flag --confirm.
//
// Cara pakai:
//   npx tsx prisma/seed-uji.ts                # dry-run (default)
//   npx tsx prisma/seed-uji.ts --confirm      # menulis ke Neon branch test
// =============================================================================

import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
import bcrypt from 'bcrypt'

type PrismaClientType = import('@prisma/client').PrismaClient

// -----------------------------------------------------------------------------
// Env & safety
// -----------------------------------------------------------------------------

function getHost(url?: string): string {
  if (!url) return ''
  const m = url.match(/@([^:/?]+)/)
  if (!m) return ''
  return m[1].replace(/-pooler$/, '')
}

function maskUrl(url: string): string {
  return url.replace(/:([^:@]+)@/, ':****@')
}

function loadTestEnvOrExit(): string {
  const backendDir = path.resolve(__dirname, '..')
  const envTestPath = path.join(backendDir, '.env.test')
  const envMainPath = path.join(backendDir, '.env')

  if (!fs.existsSync(envTestPath)) {
    console.error("❌ DIBLOKIR: backend/.env.test tidak ditemukan. Buat backend/.env.test (Neon branch 'test').")
    process.exit(1)
  }

  const testConfig = dotenv.parse(fs.readFileSync(envTestPath, 'utf-8'))
  if (!testConfig.DATABASE_URL) {
    console.error('❌ DIBLOKIR: DATABASE_URL tidak lengkap di backend/.env.test.')
    process.exit(1)
  }

  // Selalu pakai .env.test, override nilai yang mungkin sudah dimuat dari .env
  dotenv.config({ path: envTestPath, override: true })

  const targetUrl = process.env.DATABASE_URL || ''
  const targetHost = getHost(targetUrl)

  let mainHost = ''
  if (fs.existsSync(envMainPath)) {
    const mainConfig = dotenv.parse(fs.readFileSync(envMainPath, 'utf-8'))
    mainHost = getHost(mainConfig.DATABASE_URL)
  }

  if (mainHost && targetHost && mainHost === targetHost) {
    console.error('❌ DIBLOKIR: Host database tujuan SAMA dengan DB utama (backend/.env).')
    console.error(`   Host: ${targetHost}`)
    console.error("   Script ini hanya boleh berjalan terhadap Neon branch 'test'.")
    process.exit(1)
  }

  console.log('🔗 Target DB (test):', maskUrl(targetUrl))
  console.log('🔗 Host            :', targetHost)
  return targetHost
}

// WAJIB: set env sebelum PrismaClient di-require (CJS dieksekusi berurutan).
const TARGET_HOST = loadTestEnvOrExit()
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { PrismaClient } = require('@prisma/client') as { PrismaClient: new () => PrismaClientType }
const prisma: PrismaClientType = new PrismaClient()

// -----------------------------------------------------------------------------
// Definisi data uji
// -----------------------------------------------------------------------------

const OWNER_EMAIL = 'uji-owner@ngopijember.test'
const OWNER_NAME = 'Owner Uji Ngopi Jember'
const OWNER_PASSWORD = 'UjiNgopi123!' // hanya untuk DB test

const REVIEWER_COUNT = 10
const reviewerEmail = (i: number) => `uji-reviewer${i + 1}@ngopijember.test`

// Kecamatan uji (tidak dipakai kedai asli: CSV hanya memuat Sumbersari).
const DISTRICTS = 'Kaliwates'
// Titik acuan uji "terdekat" (pusat Kaliwates). Semua kedai diukur jaraknya dari sini.
const REF = { lat: -8.168, lng: 113.7, label: 'Pusat Kaliwates (acuan uji terdekat)' }

const FACILITY_NAMES: Record<string, string> = {
  wifi: 'WiFi',
  'colokan-listrik': 'Colokan Listrik',
  ac: 'AC',
  'smoking-area': 'Smoking Area',
  'parkir-motor': 'Parkir Motor',
  'parkir-mobil': 'Parkir Mobil',
  musala: 'Musala',
  toilet: 'Toilet',
  'outdoor-seating': 'Outdoor Seating',
}

interface ShopDef {
  name: string
  slug: string
  lat: number
  lng: number
  priceRange: string
  openingHours: string
  facilities: string[]
  ratings: number[]
}

// Rating DIPEROLEH dari ulasan nyata (Int 1-5), bukan field palsu.
// Jumlah ulasan & nilai dipilih agar rata-rata persis sesuai target:
//   A=3.8 (19/5), B=4.7 (47/10), C=4.0 (20/5), D=4.9 (49/10), E=3.2 (16/5)
// Semua jam buka konsisten (tidak 24 jam) dan TIDAK memakai fasilitas "Buka 24 Jam".
const SHOPS: ShopDef[] = [
  {
    name: '[UJI] Kopi Uji A',
    slug: 'uji-kopi-a',
    lat: -8.1715,
    lng: 113.7,
    priceRange: 'Rp15000 - Rp25000',
    openingHours: '08:00 - 22:00',
    facilities: ['wifi', 'colokan-listrik', 'ac'],
    ratings: [4, 4, 4, 4, 3],
  },
  {
    name: '[UJI] Kopi Uji B',
    slug: 'uji-kopi-b',
    lat: -8.186,
    lng: 113.7,
    priceRange: 'Rp25000 - Rp40000',
    openingHours: '07:00 - 23:00',
    facilities: ['wifi', 'colokan-listrik', 'ac', 'parkir-motor', 'toilet', 'outdoor-seating'],
    ratings: [5, 5, 5, 5, 5, 5, 5, 5, 5, 2],
  },
  {
    name: '[UJI] Kopi Uji C',
    slug: 'uji-kopi-c',
    lat: -8.204,
    lng: 113.7,
    priceRange: 'Rp10000 - Rp18000',
    openingHours: '09:00 - 21:00',
    facilities: ['wifi', 'parkir-motor'],
    ratings: [4, 4, 4, 4, 4],
  },
  {
    name: '[UJI] Kopi Uji D',
    slug: 'uji-kopi-d',
    lat: -8.231,
    lng: 113.7,
    priceRange: 'Rp35000 - Rp60000',
    openingHours: '08:00 - 23:00',
    facilities: ['wifi', 'colokan-listrik', 'ac', 'smoking-area', 'parkir-motor', 'parkir-mobil', 'toilet', 'musala'],
    ratings: [5, 5, 5, 5, 5, 5, 5, 5, 5, 4],
  },
  {
    name: '[UJI] Kopi Uji E',
    slug: 'uji-kopi-e',
    lat: -8.267,
    lng: 113.7,
    priceRange: 'Rp20000 - Rp30000',
    openingHours: '10:00 - 22:00',
    facilities: ['wifi', 'ac', 'parkir-motor', 'toilet', 'outdoor-seating'],
    ratings: [4, 3, 3, 3, 3],
  },
]

const DESCRIPTION = '[UJI] Data uji untuk pengujian SAW & chatbot. Bukan data produksi.'

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 10) / 10
}

function avg(ratings: number[]): number {
  return Math.round((ratings.reduce((s, r) => s + r, 0) / ratings.length) * 10) / 10
}

async function main() {
  const confirm = process.argv.includes('--confirm')
  console.log('')
  console.log('=== SEED DATA UJI (SAW / Chatbot) ===')
  console.log(`Mode: ${confirm ? 'EKSEKUSI (--confirm)' : 'DRY-RUN (tidak menulis)'}`)
  console.log(`Host: ${TARGET_HOST}`)
  console.log('')

  const allReviewerEmails = Array.from({ length: REVIEWER_COUNT }, (_, i) => reviewerEmail(i))
  const allEmails = [OWNER_EMAIL, ...allReviewerEmails]

  const existingUsers = await prisma.user.findMany({
    where: { email: { in: allEmails } },
    select: { email: true },
  })
  const existingEmailSet = new Set(existingUsers.map((u) => u.email))

  const existingShops = await prisma.coffeeShop.findMany({
    where: { slug: { in: SHOPS.map((s) => s.slug) } },
    select: { slug: true },
  })
  const existingSlugSet = new Set(existingShops.map((s) => s.slug))

  // --- PREVIEW ---
  console.log(`Titik acuan "terdekat": ${REF.label} (lat ${REF.lat}, lng ${REF.lng})`)
  console.log('')
  console.log('Owner uji:')
  console.log(`  - ${OWNER_EMAIL} (role: OWNER) [${existingEmailSet.has(OWNER_EMAIL) ? 'update' : 'create'}]`)
  console.log(`Reviewer uji: ${REVIEWER_COUNT} user (@ngopijember.test)`)
  console.log('')
  console.log('Kedai uji (semua di kecamatan ' + DISTRICTS + '):')
  for (const s of SHOPS) {
    const dist = haversineKm(REF.lat, REF.lng, s.lat, s.lng)
    console.log(`  - ${s.name} (${s.slug}) [${existingSlugSet.has(s.slug) ? 'update' : 'create'}]`)
    console.log(`      koordinat: (${s.lat}, ${s.lng}) | jarak ke acuan: ~${dist} km`)
    console.log(`      harga: ${s.priceRange} | jam: ${s.openingHours}`)
    console.log(`      fasilitas (${s.facilities.length}): ${s.facilities.join(', ')}`)
    console.log(`      ulasan (${s.ratings.length}): rata-rata ${avg(s.ratings)}`)
  }
  console.log('')

  if (!confirm) {
    console.log('⚠️  DRY-RUN: tidak ada perubahan pada database.')
    console.log('   Untuk menulis, jalankan: npx tsx prisma/seed-uji.ts --confirm')
    return
  }

  // --- EKSEKUSI ---
  console.log('✍️  Menulis data uji...')

  // 1. Pastikan fasilitas referensi ada (idempotent)
  const neededFacilitySlugs = Array.from(new Set(SHOPS.flatMap((s) => s.facilities)))
  for (const slug of neededFacilitySlugs) {
    await prisma.facility.upsert({
      where: { slug },
      update: {},
      create: { slug, name: FACILITY_NAMES[slug] ?? slug },
    })
  }
  const facilities = await prisma.facility.findMany({
    where: { slug: { in: neededFacilitySlugs } },
    select: { id: true, slug: true },
  })
  const facilityIdBySlug = new Map(facilities.map((f) => [f.slug, f.id]))

  // 2. Owner + reviewer (idempotent upsert)
  const passwordHash = bcrypt.hashSync(OWNER_PASSWORD, 10)
  const owner = await prisma.user.upsert({
    where: { email: OWNER_EMAIL },
    update: { name: OWNER_NAME, role: 'OWNER' },
    create: { email: OWNER_EMAIL, name: OWNER_NAME, role: 'OWNER', password: passwordHash },
  })

  const reviewers: { id: string }[] = []
  for (let i = 0; i < REVIEWER_COUNT; i++) {
    const email = reviewerEmail(i)
    const reviewer = await prisma.user.upsert({
      where: { email },
      update: { role: 'USER' },
      create: { email, name: `Reviewer Uji ${i + 1}`, role: 'USER', password: passwordHash },
    })
    reviewers.push({ id: reviewer.id })
  }

  // 3. Kedai + fasilitas + ulasan (idempotent)
  for (const s of SHOPS) {
    const shop = await prisma.coffeeShop.upsert({
      where: { slug: s.slug },
      update: {
        name: s.name,
        description: DESCRIPTION,
        address: `Jl. Uji ${s.slug}, ${DISTRICTS}, Jember`,
        district: DISTRICTS,
        latitude: s.lat,
        longitude: s.lng,
        priceRange: s.priceRange,
        openingHours: s.openingHours,
        isVerified: true,
        status: 'OPEN',
        ownerId: owner.id,
      },
      create: {
        name: s.name,
        slug: s.slug,
        description: DESCRIPTION,
        address: `Jl. Uji ${s.slug}, ${DISTRICTS}, Jember`,
        district: DISTRICTS,
        latitude: s.lat,
        longitude: s.lng,
        priceRange: s.priceRange,
        openingHours: s.openingHours,
        isVerified: true,
        status: 'OPEN',
        ownerId: owner.id,
      },
    })

    // Fasilitas: pastikan tepat sesuai definisi (idempotent)
    await prisma.coffeeShopFacility.deleteMany({ where: { coffeeShopId: shop.id } })
    await prisma.coffeeShopFacility.createMany({
      data: s.facilities.map((slug) => ({
        coffeeShopId: shop.id,
        facilityId: facilityIdBySlug.get(slug)!,
      })),
      skipDuplicates: true,
    })

    // Ulasan: upsert per (coffeeShopId, userId) agar rata-rata persis
    for (let i = 0; i < s.ratings.length; i++) {
      await prisma.review.upsert({
        where: { coffeeShopId_userId: { coffeeShopId: shop.id, userId: reviewers[i].id } },
        update: { rating: s.ratings[i], comment: `[UJI] ulasan ${i + 1} untuk ${s.name}` },
        create: {
          coffeeShopId: shop.id,
          userId: reviewers[i].id,
          rating: s.ratings[i],
          comment: `[UJI] ulasan ${i + 1} untuk ${s.name}`,
        },
      })
    }
  }

  // 4. Verifikasi rata-rata dari DB
  console.log('')
  console.log('✅ Seed data uji selesai. Verifikasi rata-rata rating dari tabel Review:')
  for (const s of SHOPS) {
    const shop = await prisma.coffeeShop.findUnique({ where: { slug: s.slug }, select: { id: true } })
    if (!shop) continue
    const reviews = await prisma.review.findMany({ where: { coffeeShopId: shop.id }, select: { rating: true } })
    const realAvg = reviews.length ? avg(reviews.map((r) => r.rating)) : 0
    console.log(`  - ${s.slug}: ${reviews.length} ulasan, rata-rata ${realAvg} (target ${avg(s.ratings)})`)
  }

  console.log('')
  console.log('ℹ️  Langkah selanjutnya: jalankan `npm run dev:test`, uji manual lewat chatbot,')
  console.log('   lalu `prisma/cleanup-uji.ts --confirm` SEBELUM menjalankan `npm test`.')
}

main()
  .catch((err) => {
    console.error('❌ Seed data uji gagal:', err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })