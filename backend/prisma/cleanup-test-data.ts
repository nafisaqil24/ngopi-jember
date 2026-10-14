import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

const CSV_PATH = path.join(__dirname, 'data', 'coffee-shops.csv')

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
  'Facility',
  'Category',
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
  Facility: 'facility',
  Category: 'category',
}

function maskEmail(email: string): string {
  const [local, domain] = email.split('@')
  if (!domain) return email
  if (local.length <= 2) return `${local}***@${domain}`
  return `${local.slice(0, 2)}***@${domain}`
}

function maskConnectionString(url: string): string {
  return url.replace(/:([^:@]+)@/, ':****@')
}

function parseCsvSeedNames(): string[] {
  if (!fs.existsSync(CSV_PATH)) return []
  const content = fs.readFileSync(CSV_PATH, 'utf-8')
  const lines = content.trim().split('\n')
  const names: string[] = []
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line || line.startsWith('CONTOH')) continue
    const name = line.split(',')[0].replace(/^"/, '').replace(/"$/, '')
    names.push(name)
  }
  return names
}

async function getTableCounts(): Promise<Record<string, number>> {
  const counts: Record<string, number> = {}
  for (const table of TABLES_IN_ORDER) {
    const delegate = DELEGATE_MAP[table]
    try {
      // @ts-ignore
      counts[table] = await prisma[delegate].count()
    } catch {
      counts[table] = -1
    }
  }
  return counts
}

async function main() {
  const confirm = process.argv.includes('--confirm')
  const dryRun = !confirm

  console.log('=== CLEANUP TEST DATA ===')
  console.log(`Mode: ${dryRun ? 'PREVIEW (tidak menghapus)' : 'EKSEKUSI (--confirm)'}\n`)

  // Load seed coffee shop names from CSV
  const seedShopNames = parseCsvSeedNames()
  console.log('Data seed (dari CSV, TIDAK boleh dihapus):')
  if (seedShopNames.length === 0) {
    console.log('  (File CSV tidak ditemukan atau kosong)')
  } else {
    seedShopNames.forEach(n => console.log(`  - ${n}`))
  }
  console.log('')

  // Find test users (@test.com or @ngopijember.test)
  const testUsers = await prisma.user.findMany({
    where: {
      OR: [
        { email: { endsWith: '@test.com' } },
        { email: { endsWith: '@ngopijember.test' } },
      ]
    },
    select: { id: true, email: true, role: true, createdAt: true }
  })

  if (testUsers.length === 0) {
    console.log('Tidak ada user test (@test.com / @ngopijember.test) ditemukan. Tidak ada yang perlu dibersihkan.')
    const remainingAdminsCount = await prisma.user.count({ where: { role: 'ADMIN' } })
    console.log(`\nJumlah User ber-role ADMIN yang tersisa: ${remainingAdminsCount}`)
    return
  }

  // Safety: all users to delete must end with @test.com or @ngopijember.test
  const nonTestUsers = testUsers.filter(u => !u.email.endsWith('@test.com') && !u.email.endsWith('@ngopijember.test'))
  if (nonTestUsers.length > 0) {
    console.error('❌ SAFETY CHECK GAGAL: Ada user yang akan dihapus tapi BUKAN berakhiran @test.com atau @ngopijember.test:')
    nonTestUsers.forEach(u => console.error(`  - ${u.email}`))
    process.exit(1)
  }

  const testUserIds = testUsers.map(u => u.id)

  // Find coffee shops owned by test users
  const testShops = await prisma.coffeeShop.findMany({
    where: { ownerId: { in: testUserIds } },
    select: { id: true, name: true, slug: true, ownerId: true, isVerified: true }
  })

  // Safety: no coffee shop to delete should be in CSV seed list
  const seedShopsToDelete = testShops.filter(s => seedShopNames.includes(s.name))
  if (seedShopsToDelete.length > 0) {
    console.error('❌ SAFETY CHECK GAGAL: Coffee shop berikut ada di CSV seed, TIDAK boleh dihapus:')
    seedShopsToDelete.forEach(s => console.error(`  - ${s.name} (${s.slug})`))
    process.exit(1)
  }

  const testShopIds = testShops.map(s => s.id)

  // Find reviews by test users on OTHER coffee shops (not owned by them)
  const reviewsByTestUsers = await prisma.review.findMany({
    where: { userId: { in: testUserIds } },
    select: { id: true, coffeeShopId: true, userId: true }
  })

  // Count related data to be deleted
  const [
    analyticsCount,
    shopFacilityCount,
    shopCategoryCount,
    reviewCount,
    menuCount,
    imageCount,
    promotionCount,
    subscriptionCount,
  ] = await Promise.all([
    prisma.analyticsEvent.count({ where: { coffeeShopId: { in: testShopIds } } }),
    prisma.coffeeShopFacility.count({ where: { coffeeShopId: { in: testShopIds } } }),
    prisma.coffeeShopCategory.count({ where: { coffeeShopId: { in: testShopIds } } }),
    prisma.review.count({ where: { coffeeShopId: { in: testShopIds } } }),
    prisma.menu.count({ where: { coffeeShopId: { in: testShopIds } } }),
    prisma.coffeeShopImage.count({ where: { coffeeShopId: { in: testShopIds } } }),
    prisma.promotion.count({ where: { coffeeShopId: { in: testShopIds } } }),
    prisma.subscription.count({ where: { coffeeShopId: { in: testShopIds } } }),
  ])

  // Also count reviews by test users on other shops
  const reviewsOnOtherShops = reviewsByTestUsers.filter(r => !testShopIds.includes(r.coffeeShopId)).length

  // Get owner emails for test shops (for preview)
  const ownerEmails = new Map<string, string>()
  if (testShopIds.length > 0) {
    const owners = await prisma.user.findMany({
      where: { id: { in: testShops.map(s => s.ownerId) } },
      select: { id: true, email: true }
    })
    owners.forEach(o => ownerEmails.set(o.id, o.email))
  }

  // Get DB host for preview
  const dbUrl = process.env.DATABASE_URL || ''
  const hostMatch = dbUrl.match(/@([^:/?]+)/)
  const host = hostMatch ? hostMatch[1] : 'unknown'

  // Preview output (DAFTAR user dan coffee shop, bukan cuma jumlah)
  console.log('--- PREVIEW ---')
  console.log(`Database host: ${host}`)
  console.log(`Connection: ${maskConnectionString(dbUrl)}`)
  console.log('')

  console.log('Daftar User yang akan dihapus:')
  testUsers.forEach(u => {
    console.log(`  - ${maskEmail(u.email)} (role: ${u.role}, created: ${u.createdAt.toISOString()})`)
  })
  console.log('')

  console.log('Daftar CoffeeShop yang akan dihapus:')
  if (testShops.length === 0) {
    console.log('  (Tidak ada coffee shop milik user test)')
  } else {
    testShops.forEach(s => {
      const ownerEmail = ownerEmails.get(s.ownerId) || 'unknown'
      console.log(`  - ${s.name} (${s.slug}) | owner: ${maskEmail(ownerEmail)} | isVerified: ${s.isVerified}`)
    })
  }
  console.log('')

  console.log('Jumlah row per tabel yang akan terhapus:')
  console.log(`  AnalyticsEvent:        ${analyticsCount}`)
  console.log(`  CoffeeShopFacility:    ${shopFacilityCount}`)
  console.log(`  CoffeeShopCategory:    ${shopCategoryCount}`)
  console.log(`  Review (di shop test): ${reviewCount}`)
  console.log(`  Review (user test di shop lain): ${reviewsOnOtherShops}`)
  console.log(`  Menu:                  ${menuCount}`)
  console.log(`  CoffeeShopImage:       ${imageCount}`)
  console.log(`  Promotion:             ${promotionCount}`)
  console.log(`  Subscription:          ${subscriptionCount}`)
  console.log(`  CoffeeShop:            ${testShops.length}`)
  console.log(`  User (test):           ${testUsers.length}`)
  console.log('')

  if (dryRun) {
    console.log('⚠️  Mode preview saja. Untuk benar-benar menghapus, jalankan dengan flag --confirm')
    console.log('   Contoh: npx tsx prisma/cleanup-test-data.ts --confirm')
    const remainingAdminsCount = await prisma.user.count({ where: { role: 'ADMIN' } })
    console.log(`\nJumlah User ber-role ADMIN yang tersisa: ${remainingAdminsCount}`)
    return
  }

  // --- EXECUTION ---
  console.log('🗑️  MEMULAI PENGHAPUSAN...')

  const beforeCounts = await getTableCounts()

  await prisma.$transaction(async (tx) => {
    // 1. Delete AnalyticsEvent
    if (analyticsCount > 0) {
      await tx.analyticsEvent.deleteMany({ where: { coffeeShopId: { in: testShopIds } } })
    }
    // 2. Delete CoffeeShopFacility
    if (shopFacilityCount > 0) {
      await tx.coffeeShopFacility.deleteMany({ where: { coffeeShopId: { in: testShopIds } } })
    }
    // 3. Delete CoffeeShopCategory
    if (shopCategoryCount > 0) {
      await tx.coffeeShopCategory.deleteMany({ where: { coffeeShopId: { in: testShopIds } } })
    }
    // 4. Delete Review (on test shops)
    if (reviewCount > 0) {
      await tx.review.deleteMany({ where: { coffeeShopId: { in: testShopIds } } })
    }
    // 5. Delete Review by test users on other shops
    if (reviewsOnOtherShops > 0) {
      await tx.review.deleteMany({
        where: { userId: { in: testUserIds }, coffeeShopId: { notIn: testShopIds } }
      })
    }
    // 6. Delete Menu
    if (menuCount > 0) {
      await tx.menu.deleteMany({ where: { coffeeShopId: { in: testShopIds } } })
    }
    // 7. Delete CoffeeShopImage
    if (imageCount > 0) {
      await tx.coffeeShopImage.deleteMany({ where: { coffeeShopId: { in: testShopIds } } })
    }
    // 8. Delete Promotion
    if (promotionCount > 0) {
      await tx.promotion.deleteMany({ where: { coffeeShopId: { in: testShopIds } } })
    }
    // 9. Delete Subscription
    if (subscriptionCount > 0) {
      await tx.subscription.deleteMany({ where: { coffeeShopId: { in: testShopIds } } })
    }
    // 10. Delete CoffeeShop
    if (testShops.length > 0) {
      await tx.coffeeShop.deleteMany({ where: { id: { in: testShopIds } } })
    }
    // 11. Delete User (test users)
    if (testUsers.length > 0) {
      await tx.user.deleteMany({ where: { id: { in: testUserIds } } })
    }
  })

  const afterCounts = await getTableCounts()

  console.log('\n--- HASIL ---')
  console.log('Row count sebelum vs sesudah:')
  TABLES_IN_ORDER.forEach(m => {
    const before = beforeCounts[m] ?? 0
    const after = afterCounts[m] ?? 0
    const diff = before - after
    console.log(`  ${m}: ${before} → ${after} (${diff > 0 ? `-${diff}` : '0'})`)
  })

  const remainingAdminsCount = await prisma.user.count({ where: { role: 'ADMIN' } })
  console.log(`\nJumlah User ber-role ADMIN yang tersisa: ${remainingAdminsCount}`)
  console.log('\n✅ Cleanup test data selesai.')
}

main()
  .catch((err) => {
    console.error('❌ Error:', err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
