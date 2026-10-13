import { PrismaClient } from '@prisma/client'
import * as url from 'url'

const prisma = new PrismaClient()

const TABLES_IN_ORDER = [
  'CoffeeShopFacility',
  'CoffeeShopCategory',
  'Menu',
  'Review',
  'Promotion',
  'AnalyticsEvent',
  'Subscription',
  'CoffeeShopImage',
  'CoffeeShop',
  'Facility',
  'Category',
  'User',
]

const DELEGATE_MAP: Record<string, string> = {
  CoffeeShopFacility: 'coffeeShopFacility',
  CoffeeShopCategory: 'coffeeShopCategory',
  Menu: 'menu',
  Review: 'review',
  Promotion: 'promotion',
  AnalyticsEvent: 'analyticsEvent',
  Subscription: 'subscription',
  CoffeeShopImage: 'coffeeShopImage',
  CoffeeShop: 'coffeeShop',
  Facility: 'facility',
  Category: 'category',
  User: 'user',
}

function maskDbUrl(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl)
    parsed.username = '****'
    parsed.password = '****'
    return parsed.toString()
  } catch {
    return 'postgresql://****:****@****/****'
  }
}

async function getTableCounts() {
  const counts: Record<string, number> = {}
  const errors: Record<string, string> = {}
  for (const table of TABLES_IN_ORDER) {
    const delegate = DELEGATE_MAP[table]
    if (!delegate) {
      errors[table] = 'Delegate tidak ditemukan di DELEGATE_MAP'
      counts[table] = -1
      continue
    }
    try {
      const count = await (prisma as any)[delegate].count()
      counts[table] = count
    } catch (err) {
      errors[table] = (err as Error).message
      counts[table] = -1
    }
  }
  return { counts, errors }
}

async function printTableCounts(label: string, counts: Record<string, number>, errors: Record<string, string>) {
  console.log(`\n${label}`)
  for (const table of TABLES_IN_ORDER) {
    const c = counts[table]
    const err = errors[table]
    if (c >= 0) {
      console.log(`  ${table}: ${c}`)
    } else if (err) {
      console.log(`  ${table}: ERROR - ${err}`)
    } else {
      console.log(`  ${table}: N/A`)
    }
  }
}

function getDatabaseHost(): string {
  const dbUrl = process.env.DATABASE_URL
  if (!dbUrl) return 'unknown'
  try {
    const parsed = new URL(dbUrl)
    return parsed.hostname
  } catch {
    return 'unknown'
  }
}

async function main() {
  const confirm = process.argv.includes('--confirm')
  const dbUrl = process.env.DATABASE_URL

  if (!dbUrl) {
    console.error('❌ DATABASE_URL tidak di-set di environment')
    process.exit(1)
  }

  const host = getDatabaseHost()
  console.log(`🔗 Database host: ${host}`)
  console.log(`🔗 Connection: ${maskDbUrl(dbUrl)}`)

  const { counts: beforeCounts, errors: beforeErrors } = await getTableCounts()
  await printTableCounts('📊 Jumlah row SEBELUM:', beforeCounts, beforeErrors)

  if (!confirm) {
    console.log('\n⚠️  Mode preview saja. Untuk benar-benar menghapus, jalankan dengan flag --confirm')
    console.log('   Contoh: npx tsx prisma/reset-data.ts --confirm')
    await prisma.$disconnect()
    return
  }

  console.log('\n🗑️  Menghapus data (--confirm diterima)...')

  for (const table of TABLES_IN_ORDER) {
    try {
      await (prisma as any)[table.toLowerCase()].deleteMany({})
      console.log(`  ✅ ${table} dikosongkan`)
    } catch (err) {
      console.error(`  ❌ Gagal kosongkan ${table}: ${(err as Error).message}`)
    }
  }

  const { counts: afterCounts, errors: afterErrors } = await getTableCounts()
  await printTableCounts('📊 Jumlah row SESUDAH:', afterCounts, afterErrors)

  console.log('\n✅ Reset data selesai')
  await prisma.$disconnect()
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })