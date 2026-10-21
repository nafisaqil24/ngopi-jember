// =============================================================================
// CLEANUP DATA UJI — SAW / Chatbot (Ngopi Jember)
// -----------------------------------------------------------------------------
// Menghapus HANYA data uji yang dibuat oleh seed-uji.ts:
//   - user berdomain @ngopijember.test
//   - kedai ber-slug berawalan "uji-"
//   - beserta turunannya (analitik, fasilitas, kategori, ulasan, menu, gambar,
//     promosi, subscription) dengan urutan yang benar menurut foreign key.
//
// TIDAK menyentuh kedai/user asli.
//
// Keamanan:
//   - SELALU memuat backend/.env.test (override) sebelum PrismaClient diimpor.
//   - MENOLAK jalan bila host DB tujuan sama dengan host di backend/.env (utama).
//   - Default PREVIEW; hanya menghapus dengan flag --confirm.
//
// Cara pakai:
//   npx tsx prisma/cleanup-uji.ts               # preview (default)
//   npx tsx prisma/cleanup-uji.ts --confirm     # hapus dari Neon branch test
// =============================================================================

import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'

type PrismaClientType = import('@prisma/client').PrismaClient

function getHost(url?: string): string {
  if (!url) return ''
  const m = url.match(/@([^:/?]+)/)
  if (!m) return ''
  return m[1].replace(/-pooler$/, '')
}

function maskUrl(url: string): string {
  return url.replace(/:([^:@]+)@/, ':****@')
}

function maskEmail(email: string): string {
  const [local, domain] = email.split('@')
  if (!domain) return email
  if (local.length <= 2) return `${local}***@${domain}`
  return `${local.slice(0, 2)}***@${domain}`
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

// WAJIB: set env sebelum PrismaClient di-require.
const TARGET_HOST = loadTestEnvOrExit()
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { PrismaClient } = require('@prisma/client') as { PrismaClient: new () => PrismaClientType }
const prisma: PrismaClientType = new PrismaClient()

const TABLES_IN_ORDER = [
  'AnalyticsEvent',
  'CoffeeShopFacility',
  'CoffeeShopCategory',
  'Review',
  'Menu',
  'CoffeeShopImage',
  'Promotion',
  'Subscription',
  'CoffeeShop',
  'User',
]

const DELEGATE_MAP: Record<string, string> = {
  AnalyticsEvent: 'analyticsEvent',
  CoffeeShopFacility: 'coffeeShopFacility',
  CoffeeShopCategory: 'coffeeShopCategory',
  Review: 'review',
  Menu: 'menu',
  CoffeeShopImage: 'coffeeShopImage',
  Promotion: 'promotion',
  Subscription: 'subscription',
  CoffeeShop: 'coffeeShop',
  User: 'user',
}

async function getTableCounts(): Promise<Record<string, number>> {
  const counts: Record<string, number> = {}
  for (const table of TABLES_IN_ORDER) {
    const delegate = DELEGATE_MAP[table]
    try {
      counts[table] = await (prisma as any)[delegate].count()
    } catch {
      counts[table] = -1
    }
  }
  return counts
}

async function main() {
  const confirm = process.argv.includes('--confirm')
  console.log('')
  console.log('=== CLEANUP DATA UJI (SAW / Chatbot) ===')
  console.log(`Mode: ${confirm ? 'EKSEKUSI (--confirm)' : 'PREVIEW (tidak menghapus)'}`)
  console.log(`Host: ${TARGET_HOST}`)
  console.log('')

  const testUsers = await prisma.user.findMany({
    where: { email: { endsWith: '@ngopijember.test' } },
    select: { id: true, email: true, role: true },
  })
  const testUserIds = testUsers.map((u) => u.id)

  const testShops = await prisma.coffeeShop.findMany({
    where: { slug: { startsWith: 'uji-' } },
    select: { id: true, name: true, slug: true, isVerified: true },
  })
  const testShopIds = testShops.map((s) => s.id)

  // Safety: pastikan semua kedai target benar berawalan "uji-"
  const invalidShops = testShops.filter((s) => !s.slug.startsWith('uji-'))
  if (invalidShops.length > 0) {
    console.error('❌ SAFETY CHECK GAGAL: Ada kedai target yang slug-nya BUKAN "uji-":')
    invalidShops.forEach((s) => console.error(`  - ${s.name} (${s.slug})`))
    process.exit(1)
  }

  const [
    analyticsCount,
    shopFacilityCount,
    shopCategoryCount,
    reviewByShopCount,
    reviewByUserCount,
    menuCount,
    imageCount,
    promotionCount,
    subscriptionCount,
  ] = await Promise.all([
    prisma.analyticsEvent.count({ where: { coffeeShopId: { in: testShopIds } } }),
    prisma.coffeeShopFacility.count({ where: { coffeeShopId: { in: testShopIds } } }),
    prisma.coffeeShopCategory.count({ where: { coffeeShopId: { in: testShopIds } } }),
    prisma.review.count({ where: { coffeeShopId: { in: testShopIds } } }),
    prisma.review.count({ where: { userId: { in: testUserIds }, coffeeShopId: { notIn: testShopIds } } }),
    prisma.menu.count({ where: { coffeeShopId: { in: testShopIds } } }),
    prisma.coffeeShopImage.count({ where: { coffeeShopId: { in: testShopIds } } }),
    prisma.promotion.count({ where: { coffeeShopId: { in: testShopIds } } }),
    prisma.subscription.count({ where: { coffeeShopId: { in: testShopIds } } }),
  ])

  console.log('--- PREVIEW ---')
  console.log('Daftar user uji (@ngopijember.test) yang akan dihapus:')
  if (testUsers.length === 0) console.log('  (tidak ada)')
  testUsers.forEach((u) => console.log(`  - ${maskEmail(u.email)} (role: ${u.role})`))
  console.log('')
  console.log('Daftar kedai uji (slug "uji-") yang akan dihapus:')
  if (testShops.length === 0) console.log('  (tidak ada)')
  testShops.forEach((s) => console.log(`  - ${s.name} (${s.slug}) | isVerified: ${s.isVerified}`))
  console.log('')
  console.log('Jumlah row per tabel yang akan terhapus:')
  console.log(`  AnalyticsEvent:        ${analyticsCount}`)
  console.log(`  CoffeeShopFacility:    ${shopFacilityCount}`)
  console.log(`  CoffeeShopCategory:    ${shopCategoryCount}`)
  console.log(`  Review (di kedai uji): ${reviewByShopCount}`)
  console.log(`  Review (user uji di kedai lain): ${reviewByUserCount}`)
  console.log(`  Menu:                  ${menuCount}`)
  console.log(`  CoffeeShopImage:       ${imageCount}`)
  console.log(`  Promotion:             ${promotionCount}`)
  console.log(`  Subscription:          ${subscriptionCount}`)
  console.log(`  CoffeeShop:            ${testShops.length}`)
  console.log(`  User:                  ${testUsers.length}`)
  console.log('')

  if (testUsers.length === 0 && testShops.length === 0) {
    console.log('Tidak ada data uji. Tidak ada yang perlu dibersihkan.')
    return
  }

  if (!confirm) {
    console.log('⚠️  PREVIEW saja. Untuk menghapus, jalankan: npx tsx prisma/cleanup-uji.ts --confirm')
    return
  }

  // --- EKSEKUSI ---
  console.log('🗑️  Menghapus data uji...')
  const beforeCounts = await getTableCounts()
  const realShopsBefore = await prisma.coffeeShop.count({ where: { NOT: { slug: { startsWith: 'uji-' } } } })
  const realUsersBefore = await prisma.user.count({ where: { NOT: { email: { endsWith: '@ngopijember.test' } } } })

  await prisma.$transaction(async (tx) => {
    // 1. AnalyticsEvent
    if (analyticsCount > 0) await tx.analyticsEvent.deleteMany({ where: { coffeeShopId: { in: testShopIds } } })
    // 2. CoffeeShopFacility
    if (shopFacilityCount > 0) await tx.coffeeShopFacility.deleteMany({ where: { coffeeShopId: { in: testShopIds } } })
    // 3. CoffeeShopCategory
    if (shopCategoryCount > 0) await tx.coffeeShopCategory.deleteMany({ where: { coffeeShopId: { in: testShopIds } } })
    // 4. Review di kedai uji
    if (reviewByShopCount > 0) await tx.review.deleteMany({ where: { coffeeShopId: { in: testShopIds } } })
    // 5. Review oleh user uji di kedai lain (agar user bisa dihapus)
    if (reviewByUserCount > 0) {
      await tx.review.deleteMany({ where: { userId: { in: testUserIds }, coffeeShopId: { notIn: testShopIds } } })
    }
    // 6. Menu
    if (menuCount > 0) await tx.menu.deleteMany({ where: { coffeeShopId: { in: testShopIds } } })
    // 7. CoffeeShopImage
    if (imageCount > 0) await tx.coffeeShopImage.deleteMany({ where: { coffeeShopId: { in: testShopIds } } })
    // 8. Promotion
    if (promotionCount > 0) await tx.promotion.deleteMany({ where: { coffeeShopId: { in: testShopIds } } })
    // 9. Subscription
    if (subscriptionCount > 0) await tx.subscription.deleteMany({ where: { coffeeShopId: { in: testShopIds } } })
    // 10. CoffeeShop
    if (testShops.length > 0) await tx.coffeeShop.deleteMany({ where: { id: { in: testShopIds } } })
    // 11. User
    if (testUsers.length > 0) await tx.user.deleteMany({ where: { id: { in: testUserIds } } })
  })

  const afterCounts = await getTableCounts()
  const realShopsAfter = await prisma.coffeeShop.count({ where: { NOT: { slug: { startsWith: 'uji-' } } } })
  const realUsersAfter = await prisma.user.count({ where: { NOT: { email: { endsWith: '@ngopijember.test' } } } })

  console.log('')
  console.log('--- HASIL ---')
  console.log('Jumlah row sebelum vs sesudah:')
  for (const t of TABLES_IN_ORDER) {
    const before = beforeCounts[t] ?? 0
    const after = afterCounts[t] ?? 0
    const diff = before - after
    console.log(`  ${t}: ${before} → ${after} (${diff > 0 ? `-${diff}` : '0'})`)
  }
  console.log('')
  console.log(`Kedai asli (non "uji-"): ${realShopsBefore} → ${realShopsAfter}`)
  console.log(`User asli (non @ngopijember.test): ${realUsersBefore} → ${realUsersAfter}`)
  if (realShopsBefore === realShopsAfter && realUsersBefore === realUsersAfter) {
    console.log('✅ Data asli tidak tersentuh.')
  } else {
    console.log('⚠️  PERINGATAN: jumlah data asli berubah. Periksa kembali!')
  }
  console.log('✅ Cleanup data uji selesai.')
}

main()
  .catch((err) => {
    console.error('❌ Cleanup data uji gagal:', err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })