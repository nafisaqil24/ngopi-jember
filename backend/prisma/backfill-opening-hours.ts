// =============================================================================
// BACKFILL OPENING HOURS — Ngopi Jember
// -----------------------------------------------------------------------------
// Mengisi tabel OpeningHour (7 baris per kedai) dari kolom lama
// CoffeeShop.openingHours. Kolom lama TIDAK dihapus/diubah.
//
// Keamanan:
//   - SELALU memuat backend/.env.test (override) sebelum PrismaClient diimpor.
//   - MENOLAK jalan bila host DB tujuan sama dengan host di backend/.env (utama).
//   - Default DRY-RUN; hanya menulis dengan flag --confirm.
//   - Idempotent: memakai upsert pada unique (coffeeShopId, dayOfWeek).
//
// Cara pakai:
//   npx tsx prisma/backfill-opening-hours.ts             # dry-run (default)
//   npx tsx prisma/backfill-opening-hours.ts --confirm   # menulis ke Neon test
// =============================================================================

import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
import { parseLegacyOpeningHours } from '../src/utils/openingHours.js'

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

const TARGET_HOST = loadTestEnvOrExit()
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { PrismaClient } = require('@prisma/client') as { PrismaClient: new () => PrismaClientType }
const prisma: PrismaClientType = new PrismaClient()

interface PlannedShop {
  id: string
  slug: string
  name: string
  openingHours: string
  openMinutes: number
  closeMinutes: number
}

async function main() {
  const apply = process.argv.includes('--confirm')

  console.log('')
  console.log('=== BACKFILL OPENING HOUR (per hari) ===')
  console.log(`Mode: ${apply ? 'EKSEKUSI (--confirm)' : 'DRY-RUN (tidak menulis)'}`)
  console.log(`Host: ${TARGET_HOST}`)
  console.log('')

  const shops = await prisma.coffeeShop.findMany({
    select: { id: true, slug: true, name: true, openingHours: true },
    orderBy: { name: 'asc' },
  })

  console.log(`Ditemukan ${shops.length} kedai`)

  const planned: PlannedShop[] = []
  const skipped: Array<{ slug: string; name: string; openingHours: string }> = []

  for (const shop of shops) {
    const parsed = parseLegacyOpeningHours(shop.openingHours)
    if (!parsed) {
      skipped.push({ slug: shop.slug, name: shop.name, openingHours: shop.openingHours })
      continue
    }
    planned.push({
      id: shop.id,
      slug: shop.slug,
      name: shop.name,
      openingHours: shop.openingHours,
      openMinutes: parsed.openMinutes,
      closeMinutes: parsed.closeMinutes,
    })
  }

  console.log(`Bisa diproses  : ${planned.length} kedai (${planned.length * 7} baris)`)
  console.log(`Dilewati       : ${skipped.length} kedai`)
  console.log('')

  if (skipped.length > 0) {
    console.log('⚠️  Kedai tanpa baris (openingHours gagal diparse):')
    for (const shop of skipped) {
      console.log(`   - ${shop.name} (${shop.slug}): "${shop.openingHours}"`)
    }
    console.log('')
  }

  if (planned.length > 0) {
    console.log('Preview:')
    for (const shop of planned) {
      console.log(
        `   - ${shop.name} (${shop.slug}): ${shop.openMinutes} -> ${shop.closeMinutes} menit x 7 hari`
      )
    }
    console.log('')
  }

  if (!apply) {
    console.log('⚠️  DRY-RUN. Tidak ada data yang ditulis.')
    console.log('   Untuk menulis, jalankan: npx tsx prisma/backfill-opening-hours.ts --confirm')
    await prisma.$disconnect()
    return
  }

  console.log('✍️  Menulis OpeningHour (upsert)...')
  let upserted = 0

  await prisma.$transaction(async (tx) => {
    for (const shop of planned) {
      for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
        await tx.openingHour.upsert({
          where: {
            coffeeShopId_dayOfWeek: {
              coffeeShopId: shop.id,
              dayOfWeek,
            },
          },
          update: {
            openMinutes: shop.openMinutes,
            closeMinutes: shop.closeMinutes,
            isClosed: false,
          },
          create: {
            coffeeShopId: shop.id,
            dayOfWeek,
            openMinutes: shop.openMinutes,
            closeMinutes: shop.closeMinutes,
            isClosed: false,
          },
        })
        upserted++
      }
    }
  })

  console.log(`✅ Selesai. ${upserted} baris OpeningHour di-upsert.`)
  if (skipped.length > 0) {
    console.log(`⚠️  ${skipped.length} kedai dilewati (lihat log di atas).`)
  }

  await prisma.$disconnect()
}

main().catch(async (error) => {
  console.error('❌ Error:', error)
  await prisma.$disconnect()
  process.exit(1)
})