import { PrismaClient, Prisma } from '@prisma/client'
import fs from 'fs'
import path from 'path'
import { parse } from 'csv-parse/sync'

const prisma = new PrismaClient()

// Daftar nama harus PERSIS sama dengan seed.ts
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

const CATEGORY_SET = new Set<string>(CATEGORIES)
const FACILITY_SET = new Set<string>(FACILITIES)

const CSV_PATH = path.join(__dirname, 'data', 'coffee-shop-updates.csv')

const REQUIRED_HEADERS = [
  'slug',
  'latitude',
  'longitude',
  'openingHours',
  'priceRange',
  'phone',
  'instagram',
  'facilities',
  'categories',
]

// Kisaran kasar wilayah Jember (hanya untuk WARNING)
const JEMBER_LAT_MIN = -8.6
const JEMBER_LAT_MAX = -7.8
const JEMBER_LNG_MIN = 113.2
const JEMBER_LNG_MAX = 114.2

// Minimal jumlah digit desimal sebelum dianggap "presisi rendah"
const MIN_DECIMALS = 5

type RawRow = Record<string, string | undefined>

type ParsedFields = {
  latitude?: number
  longitude?: number
  openingHours?: string
  priceRange?: string
  phone?: string
  instagram?: string
  facilityNames?: string[]
  categoryNames?: string[]
}

type ParsedRow = {
  rowNumber: number
  slug: string
  fields: ParsedFields
  warnings: string[]
  errors: string[]
}

type Change = { field: string; from: string; to: string }

type ShopRecord = Prisma.CoffeeShopGetPayload<{
  include: {
    categories: { include: { category: true } }
    facilities: { include: { facility: true } }
  }
}>

type ShopPlan = {
  rowNumber: number
  slug: string
  shop: ShopRecord
  changes: Change[]
  data: Prisma.CoffeeShopUpdateInput
  facilityIds?: string[]
  categoryIds?: string[]
}

function getDatabaseHost(): string {
  const dbUrl = process.env.DATABASE_URL
  if (!dbUrl) return 'unknown'
  try {
    return new URL(dbUrl).hostname
  } catch {
    return 'unknown'
  }
}

function countDecimals(value: string): number {
  const dot = value.indexOf('.')
  if (dot === -1) return 0
  return value.slice(dot + 1).replace(/[^0-9]/g, '').length
}

function normalizePhone(raw: string): string {
  let value = raw.replace(/[\s\-+]/g, '')
  if (value.startsWith('0')) value = '62' + value.slice(1)
  return value
}

function normalizeInstagram(raw: string): string {
  return raw.replace(/^@+/, '').trim()
}

function fmt(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return '(kosong)'
  return String(value)
}

function parseRefList(
  value: string | undefined,
  allowed: Set<string>,
  label: string,
  rowNumber: number,
  slug: string,
  warnings: string[],
  errors: string[],
): string[] | undefined {
  const raw = (value ?? '').trim()
  if (raw === '') return undefined

  const names = raw
    .split('|')
    .map((part) => part.trim())
    .filter((part) => part.length > 0)

  if (names.length === 0) {
    warnings.push(`Baris ${rowNumber} (${slug}): kolom ${label} tidak berisi nama valid, dilewati.`)
    return undefined
  }

  const deduped = Array.from(new Set(names))
  for (const name of deduped) {
    if (!allowed.has(name)) {
      errors.push(`Baris ${rowNumber} (${slug}): ${label} "${name}" tidak ada di daftar seed.ts. Nama harus persis sama.`)
    }
  }
  return deduped
}

function parseRows(records: RawRow[]): ParsedRow[] {
  return records.map((raw, index) => {
    const rowNumber = index + 2 // baris 1 = header
    const warnings: string[] = []
    const errors: string[] = []
    const fields: ParsedFields = {}

    const slug = (raw.slug ?? '').trim()
    if (slug === '') {
      errors.push(`Baris ${rowNumber}: kolom "slug" kosong.`)
    }
    const label = slug || 'tanpa-slug'

    // latitude / longitude dibaca sebagai STRING dulu
    const latRaw = (raw.latitude ?? '').trim()
    const lngRaw = (raw.longitude ?? '').trim()
    const latFilled = latRaw !== ''
    const lngFilled = lngRaw !== ''

    if (latFilled !== lngFilled) {
      errors.push(`Baris ${rowNumber} (${label}): latitude dan longitude harus diisi bersamaan (salah satu kosong). Baris ditolak.`)
    } else if (latFilled && lngFilled) {
      const latNum = Number(latRaw)
      const lngNum = Number(lngRaw)
      const latValid = Number.isFinite(latNum)
      const lngValid = Number.isFinite(lngNum)

      if (!latValid) errors.push(`Baris ${rowNumber} (${label}): latitude "${latRaw}" bukan angka valid.`)
      if (!lngValid) errors.push(`Baris ${rowNumber} (${label}): longitude "${lngRaw}" bukan angka valid.`)

      const latDecimals = countDecimals(latRaw)
      const lngDecimals = countDecimals(lngRaw)
      if (latValid && latDecimals < MIN_DECIMALS) {
        warnings.push(`Baris ${rowNumber} (${label}): latitude "${latRaw}" presisi rendah (${latDecimals} desimal, disarankan >= ${MIN_DECIMALS}).`)
      }
      if (lngValid && lngDecimals < MIN_DECIMALS) {
        warnings.push(`Baris ${rowNumber} (${label}): longitude "${lngRaw}" presisi rendah (${lngDecimals} desimal, disarankan >= ${MIN_DECIMALS}).`)
      }
      if (latValid && (latNum < JEMBER_LAT_MIN || latNum > JEMBER_LAT_MAX)) {
        warnings.push(`Baris ${rowNumber} (${label}): latitude ${latRaw} di luar kisaran kasar Jember (${JEMBER_LAT_MIN} s/d ${JEMBER_LAT_MAX}).`)
      }
      if (lngValid && (lngNum < JEMBER_LNG_MIN || lngNum > JEMBER_LNG_MAX)) {
        warnings.push(`Baris ${rowNumber} (${label}): longitude ${lngRaw} di luar kisaran kasar Jember (${JEMBER_LNG_MIN} s/d ${JEMBER_LNG_MAX}).`)
      }

      if (latValid) fields.latitude = latNum
      if (lngValid) fields.longitude = lngNum
    }

    const openingHours = (raw.openingHours ?? '').trim()
    if (openingHours !== '') fields.openingHours = openingHours

    const priceRange = (raw.priceRange ?? '').trim()
    if (priceRange !== '') fields.priceRange = priceRange

    const phoneRaw = (raw.phone ?? '').trim()
    if (phoneRaw !== '') {
      const phone = normalizePhone(phoneRaw)
      if (phone === '') {
        warnings.push(`Baris ${rowNumber} (${label}): kolom phone tidak berisi digit valid, dilewati.`)
      } else {
        fields.phone = phone
      }
    }

    const instagramRaw = (raw.instagram ?? '').trim()
    if (instagramRaw !== '') {
      const instagram = normalizeInstagram(instagramRaw)
      if (instagram === '') {
        warnings.push(`Baris ${rowNumber} (${label}): kolom instagram hanya berisi "@", dilewati.`)
      } else {
        fields.instagram = instagram
      }
    }

    const facilityNames = parseRefList(raw.facilities, FACILITY_SET, 'facility', rowNumber, label, warnings, errors)
    if (facilityNames) fields.facilityNames = facilityNames

    const categoryNames = parseRefList(raw.categories, CATEGORY_SET, 'kategori', rowNumber, label, warnings, errors)
    if (categoryNames) fields.categoryNames = categoryNames

    return { rowNumber, slug, fields, warnings, errors }
  })
}

async function main() {
  const apply = process.argv.includes('--apply')

  console.log(`🔗 Database host: ${getDatabaseHost()}`)
  console.log(`🧭 Mode: ${apply ? 'APPLY (menulis ke database)' : 'PREVIEW (tidak menulis)'}`)
  console.log(`📄 CSV: ${CSV_PATH}`)
  console.log('')

  if (!fs.existsSync(CSV_PATH)) {
    console.error(`❌ File CSV tidak ditemukan: ${CSV_PATH}`)
    process.exit(1)
  }

  const content = fs.readFileSync(CSV_PATH, 'utf-8')
  const records = parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    bom: true,
  }) as RawRow[]

  if (records.length === 0) {
    console.log('ℹ️  CSV kosong. Tidak ada yang diproses.')
    return
  }

  const headers = Object.keys(records[0])
  const missingHeaders = REQUIRED_HEADERS.filter((header) => !headers.includes(header))
  if (missingHeaders.length > 0) {
    console.error(`❌ Kolom wajib tidak ditemukan di CSV: ${missingHeaders.join(', ')}`)
    process.exit(1)
  }

  const parsedRows = parseRows(records)

  const warnings = parsedRows.flatMap((row) => row.warnings)
  const parseErrors = parsedRows.flatMap((row) => row.errors)

  if (warnings.length > 0) {
    console.log('⚠️  WARNING:')
    warnings.forEach((warning) => console.log(`   - ${warning}`))
    console.log('')
  }

  if (parseErrors.length > 0) {
    console.error('❌ Validasi CSV gagal (tidak ada yang ditulis):')
    parseErrors.forEach((error) => console.error(`   - ${error}`))
    process.exit(1)
  }

  // Resolve slug -> coffee shop
  const slugs = Array.from(new Set(parsedRows.map((row) => row.slug).filter((slug) => slug !== '')))
  const shops = await prisma.coffeeShop.findMany({
    where: { slug: { in: slugs } },
    include: {
      categories: { include: { category: true } },
      facilities: { include: { facility: true } },
    },
  })
  const shopBySlug = new Map(shops.map((shop) => [shop.slug, shop]))

  const resolveErrors: string[] = []
  for (const row of parsedRows) {
    if (row.slug === '') continue
    if (!shopBySlug.has(row.slug)) {
      resolveErrors.push(`Baris ${row.rowNumber}: slug "${row.slug}" tidak ditemukan di database. Script tidak membuat coffee shop baru.`)
    }
  }

  // Resolve kategori/fasilitas -> id
  const allCategoryNames = Array.from(new Set(parsedRows.flatMap((row) => row.fields.categoryNames ?? [])))
  const allFacilityNames = Array.from(new Set(parsedRows.flatMap((row) => row.fields.facilityNames ?? [])))

  const categoryRecords = allCategoryNames.length
    ? await prisma.category.findMany({ where: { name: { in: allCategoryNames } } })
    : []
  const facilityRecords = allFacilityNames.length
    ? await prisma.facility.findMany({ where: { name: { in: allFacilityNames } } })
    : []

  const categoryIdByName = new Map(categoryRecords.map((category) => [category.name, category.id]))
  const facilityIdByName = new Map(facilityRecords.map((facility) => [facility.name, facility.id]))

  for (const name of allCategoryNames) {
    if (!categoryIdByName.has(name)) {
      resolveErrors.push(`Kategori "${name}" tidak ada di database. Jalankan prisma:seed terlebih dahulu.`)
    }
  }
  for (const name of allFacilityNames) {
    if (!facilityIdByName.has(name)) {
      resolveErrors.push(`Fasilitas "${name}" tidak ada di database. Jalankan prisma:seed terlebih dahulu.`)
    }
  }

  if (resolveErrors.length > 0) {
    console.error('❌ Tidak dapat melanjutkan (tidak ada yang ditulis):')
    resolveErrors.forEach((error) => console.error(`   - ${error}`))
    process.exit(1)
  }

  // Bangun rencana perubahan
  const plans: ShopPlan[] = []
  for (const row of parsedRows) {
    const shop = shopBySlug.get(row.slug)
    if (!shop) continue

    const fields = row.fields
    const changes: Change[] = []
    const data: Prisma.CoffeeShopUpdateInput = {}

    if (fields.latitude !== undefined) {
      if (shop.latitude !== fields.latitude) {
        changes.push({ field: 'latitude', from: fmt(shop.latitude), to: fmt(fields.latitude) })
      }
      data.latitude = fields.latitude
    }
    if (fields.longitude !== undefined) {
      if (shop.longitude !== fields.longitude) {
        changes.push({ field: 'longitude', from: fmt(shop.longitude), to: fmt(fields.longitude) })
      }
      data.longitude = fields.longitude
    }
    if (fields.openingHours !== undefined) {
      if (shop.openingHours !== fields.openingHours) {
        changes.push({ field: 'openingHours', from: shop.openingHours, to: fields.openingHours })
      }
      data.openingHours = fields.openingHours
    }
    if (fields.priceRange !== undefined) {
      if (shop.priceRange !== fields.priceRange) {
        changes.push({ field: 'priceRange', from: shop.priceRange, to: fields.priceRange })
      }
      data.priceRange = fields.priceRange
    }
    if (fields.phone !== undefined) {
      if ((shop.phone ?? '') !== fields.phone) {
        changes.push({ field: 'phone', from: fmt(shop.phone), to: fields.phone })
      }
      data.phone = fields.phone
    }
    if (fields.instagram !== undefined) {
      if ((shop.instagram ?? '') !== fields.instagram) {
        changes.push({ field: 'instagram', from: fmt(shop.instagram), to: fields.instagram })
      }
      data.instagram = fields.instagram
    }

    let facilityIds: string[] | undefined
    if (fields.facilityNames) {
      facilityIds = fields.facilityNames.map((name) => facilityIdByName.get(name)!)
      const currentNames = shop.facilities.map((item) => item.facility.name)
      changes.push({
        field: 'facilities',
        from: currentNames.length ? currentNames.join('|') : '(kosong)',
        to: fields.facilityNames.join('|'),
      })
    }

    let categoryIds: string[] | undefined
    if (fields.categoryNames) {
      categoryIds = fields.categoryNames.map((name) => categoryIdByName.get(name)!)
      const currentNames = shop.categories.map((item) => item.category.name)
      changes.push({
        field: 'categories',
        from: currentNames.length ? currentNames.join('|') : '(kosong)',
        to: fields.categoryNames.join('|'),
      })
    }

    plans.push({ rowNumber: row.rowNumber, slug: row.slug, shop, changes, data, facilityIds, categoryIds })
  }

  console.log('=== PREVIEW PERUBAHAN ===')
  for (const plan of plans) {
    console.log(`\n${plan.shop.name} (${plan.shop.slug})`)
    if (plan.changes.length === 0) {
      console.log('  (tidak ada perubahan)')
      continue
    }
    for (const change of plan.changes) {
      console.log(`  ${change.field}: ${change.from} -> ${change.to}`)
    }
  }
  console.log('')

  const targets = plans.filter(
    (plan) =>
      Object.keys(plan.data).length > 0 ||
      plan.facilityIds !== undefined ||
      plan.categoryIds !== undefined,
  )

  if (!apply) {
    const changedShops = plans.filter((plan) => plan.changes.length > 0).length
    console.log(`ℹ️  PREVIEW selesai. ${changedShops} coffee shop akan berubah. Tidak ada data yang ditulis.`)
    console.log('   Jalankan dengan flag --apply untuk menerapkan perubahan.')
    return
  }

  if (targets.length === 0) {
    console.log('ℹ️  Tidak ada perubahan untuk diterapkan.')
    return
  }

  await prisma.$transaction(async (tx) => {
    for (const plan of targets) {
      if (Object.keys(plan.data).length > 0) {
        await tx.coffeeShop.update({ where: { id: plan.shop.id }, data: plan.data })
      }
      if (plan.facilityIds !== undefined) {
        await tx.coffeeShopFacility.deleteMany({ where: { coffeeShopId: plan.shop.id } })
        if (plan.facilityIds.length > 0) {
          await tx.coffeeShopFacility.createMany({
            data: plan.facilityIds.map((facilityId) => ({ coffeeShopId: plan.shop.id, facilityId })),
          })
        }
      }
      if (plan.categoryIds !== undefined) {
        await tx.coffeeShopCategory.deleteMany({ where: { coffeeShopId: plan.shop.id } })
        if (plan.categoryIds.length > 0) {
          await tx.coffeeShopCategory.createMany({
            data: plan.categoryIds.map((categoryId) => ({ coffeeShopId: plan.shop.id, categoryId })),
          })
        }
      }
    }
  })

  console.log(`✅ Selesai. ${targets.length} coffee shop diperbarui.`)
}

main()
  .catch((error) => {
    console.error('❌ Gagal:', error instanceof Error ? error.message : error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })