import { PrismaClient, UserRole, CoffeeShopStatus, Prisma } from '@prisma/client'
import { hashPassword } from '../src/utils/password'
import { parse } from 'csv-parse/sync'
import * as fs from 'fs'
import * as path from 'path'

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

async function getOrCreateUser(
  email: string,
  name: string,
  password: string,
  role: UserRole
) {
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    console.log(`   User ${email} sudah ada, lewati pembuatan`)
    return existing
  }
  const hashed = await hashPassword(password)
  const user = await prisma.user.create({
    data: { email, name, password: hashed, role },
  })
  console.log(`   User ${email} (${role}) dibuat`)
  return user
}

function validateEnvVars(): {
  adminEmail: string
  adminPassword: string
  adminName: string
  ownerEmail: string
  ownerPassword: string
  ownerName: string
} {
  const required = [
    'SEED_ADMIN_EMAIL',
    'SEED_ADMIN_PASSWORD',
    'SEED_ADMIN_NAME',
    'SEED_OWNER_EMAIL',
    'SEED_OWNER_PASSWORD',
    'SEED_OWNER_NAME',
  ]
  const missing = required.filter((k) => !process.env[k])
  if (missing.length > 0) {
    throw new Error(
      `ENV variabel wajib tidak di-set: ${missing.join(', ')}. ` +
        `Isi di .env sebelum menjalankan seed.`
    )
  }
  return {
    adminEmail: process.env.SEED_ADMIN_EMAIL!,
    adminPassword: process.env.SEED_ADMIN_PASSWORD!,
    adminName: process.env.SEED_ADMIN_NAME!,
    ownerEmail: process.env.SEED_OWNER_EMAIL!,
    ownerPassword: process.env.SEED_OWNER_PASSWORD!,
    ownerName: process.env.SEED_OWNER_NAME!,
  }
}

interface CoffeeShopRow {
  name: string
  address: string
  district: string
  latitude: string
  longitude: string
  description: string
  priceRange: string
  openingHours: string
  phone: string
  instagram: string
  categories: string
  facilities: string
}

function parseCsv(filePath: string): CoffeeShopRow[] {
  const content = fs.readFileSync(filePath, 'utf-8')
  const records = parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as CoffeeShopRow[]
  return records
}

function validateRow(row: CoffeeShopRow, lineNum: number): void {
  const requiredFields = [
    'name',
    'address',
    'district',
    'description',
    'priceRange',
    'openingHours',
  ]
  for (const field of requiredFields) {
    if (!row[field] || row[field].trim() === '') {
      throw new Error(
        `Baris ${lineNum}: field wajib '${field}' kosong (name: ${row.name})`
      )
    }
  }
  const lat = parseFloat(row.latitude)
  const lng = parseFloat(row.longitude)
  if (isNaN(lat) || isNaN(lng)) {
    throw new Error(
      `Baris ${lineNum}: latitude/longitude tidak valid (name: ${row.name})`
    )
  }
  if (lat < -8.6 || lat > -7.8 || lng < 113.2 || lng > 114.2) {
    console.warn(
      `⚠️  Baris ${lineNum}: koordinat di luar kisaran Jember (lat: ${lat}, lng: ${lng}) - name: ${row.name}`
    )
  }
  const catNames = row.categories.split('|').map((s) => s.trim()).filter(Boolean)
  for (const cat of catNames) {
    if (!CATEGORIES.includes(cat as typeof CATEGORIES[number])) {
      throw new Error(
        `Baris ${lineNum}: kategori tidak dikenal '${cat}' (name: ${row.name}). ` +
          `Kategori valid: ${CATEGORIES.join(', ')}`
      )
    }
  }
  const facNames = row.facilities.split('|').map((s) => s.trim()).filter(Boolean)
  for (const fac of facNames) {
    if (!FACILITIES.includes(fac as typeof FACILITIES[number])) {
      throw new Error(
        `Baris ${lineNum}: fasilitas tidak dikenal '${fac}' (name: ${row.name}). ` +
          `Fasilitas valid: ${FACILITIES.join(', ')}`
      )
    }
  }
}

async function upsertCoffeeShop(
  row: CoffeeShopRow,
  ownerId: string,
  dryRun: boolean
) {
  const baseSlug = slugify(row.name)
  let slug = baseSlug
  let counter = 1
  while (true) {
    const existing = await prisma.coffeeShop.findUnique({ where: { slug } })
    if (!existing) break
    if (existing.ownerId === ownerId && existing.name === row.name) {
      slug = existing.slug
      break
    }
    slug = `${baseSlug}-${counter}`
    counter++
  }

  const data: Prisma.CoffeeShopCreateInput = {
    name: row.name,
    slug,
    address: row.address,
    district: row.district,
    latitude: parseFloat(row.latitude),
    longitude: parseFloat(row.longitude),
    description: row.description,
    priceRange: row.priceRange,
    openingHours: row.openingHours,
    phone: row.phone || null,
    instagram: row.instagram || null,
    status: CoffeeShopStatus.OPEN,
    isVerified: true,
    isFeatured: false,
    owner: { connect: { id: ownerId } },
  }

  if (dryRun) {
    console.log(`   [DRY-RUN] Akan upsert CoffeeShop: ${row.name} (slug: ${slug})`)
    return { slug, isNew: true }
  }

  const shop = await prisma.coffeeShop.upsert({
    where: { slug },
    update: {
      name: row.name,
      address: row.address,
      district: row.district,
      latitude: parseFloat(row.latitude),
      longitude: parseFloat(row.longitude),
      description: row.description,
      priceRange: row.priceRange,
      openingHours: row.openingHours,
      phone: row.phone || null,
      instagram: row.instagram || null,
      status: CoffeeShopStatus.OPEN,
      isVerified: true,
    },
    create: data,
  })

  const catNames = row.categories.split('|').map((s) => s.trim()).filter(Boolean)
  const facNames = row.facilities.split('|').map((s) => s.trim()).filter(Boolean)

  const categories = await prisma.category.findMany({
    where: { name: { in: catNames } },
    select: { id: true },
  })
  const facilities = await prisma.facility.findMany({
    where: { name: { in: facNames } },
    select: { id: true },
  })

  await prisma.$transaction([
    prisma.coffeeShopCategory.deleteMany({ where: { coffeeShopId: shop.id } }),
    prisma.coffeeShopCategory.createMany({
      data: categories.map((c) => ({ coffeeShopId: shop.id, categoryId: c.id })),
      skipDuplicates: true,
    }),
    prisma.coffeeShopFacility.deleteMany({ where: { coffeeShopId: shop.id } }),
    prisma.coffeeShopFacility.createMany({
      data: facilities.map((f) => ({ coffeeShopId: shop.id, facilityId: f.id })),
      skipDuplicates: true,
    }),
  ])

  return { slug: shop.slug, isNew: true }
}

interface MenuRow {
  coffeeShopName: string
  name: string
  price: string
  category: string
  description: string
}

async function seedMenus(ownerId: string, dryRun: boolean) {
  const menuCsvPath = path.join(__dirname, 'data', 'menus.csv')
  if (!fs.existsSync(menuCsvPath)) {
    console.log('📄 File menus.csv tidak ditemukan, skip seed menu')
    return
  }
  console.log('📦 Seed Menu dari menus.csv...')
  const content = fs.readFileSync(menuCsvPath, 'utf-8')
  const records = parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as MenuRow[]

  const shops = await prisma.coffeeShop.findMany({
    where: { ownerId },
    select: { id: true, name: true },
  })
  const shopByName = new Map(shops.map((s) => [s.name, s.id]))

  for (const row of records) {
    const shopId = shopByName.get(row.coffeeShopName)
    if (!shopId) {
      console.warn(`⚠️  Coffee shop '${row.coffeeShopName}' tidak ditemukan, skip menu: ${row.name}`)
      continue
    }
    const price = parseInt(row.price, 10)
    if (isNaN(price) || price < 0) {
      console.warn(`⚠️  Harga tidak valid untuk menu '${row.name}', skip`)
      continue
    }
    if (dryRun) {
      console.log(`   [DRY-RUN] Akan upsert Menu: ${row.name} (shop: ${row.coffeeShopName})`)
      continue
    }
    await prisma.menu.upsert({
      where: {
        id: (
          await prisma.menu.findFirst({
            where: { coffeeShopId: shopId, name: row.name },
            select: { id: true },
          })
        )?.id ?? 'new',
      },
      update: {
        price,
        category: row.category || null,
        description: row.description || null,
      },
      create: {
        coffeeShopId: shopId,
        name: row.name,
        price,
        category: row.category || null,
        description: row.description || null,
      },
    })
  }
  console.log(`   ${records.length} baris menu diproses`)
}

async function printCounts() {
  const [
    userCount,
    shopCount,
    categoryCount,
    facilityCount,
    csCatCount,
    csFacCount,
    menuCount,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.coffeeShop.count(),
    prisma.category.count(),
    prisma.facility.count(),
    prisma.coffeeShopCategory.count(),
    prisma.coffeeShopFacility.count(),
    prisma.menu.count(),
  ])
  console.log('\n📊 Ringkasan jumlah row:')
  console.log(`   User: ${userCount}`)
  console.log(`   CoffeeShop: ${shopCount}`)
  console.log(`   Category: ${categoryCount}`)
  console.log(`   Facility: ${facilityCount}`)
  console.log(`   CoffeeShopCategory: ${csCatCount}`)
  console.log(`   CoffeeShopFacility: ${csFacCount}`)
  console.log(`   Menu: ${menuCount}`)
}

async function main() {
  const dryRun = process.argv.includes('--dry-run')
  if (dryRun) {
    console.log('🔍 MODE DRY-RUN: Validasi saja, tidak menulis ke database')
  }

  try {
    console.log('🌱 Mulai seed...')

    await upsertCategories()
    await upsertFacilities()

    const env = validateEnvVars()

    const admin = await getOrCreateUser(
      env.adminEmail,
      env.adminName,
      env.adminPassword,
      UserRole.ADMIN
    )
    const owner = await getOrCreateUser(
      env.ownerEmail,
      env.ownerName,
      env.ownerPassword,
      UserRole.OWNER
    )

    const csvPath = path.join(__dirname, 'data', 'coffee-shops.csv')
    if (!fs.existsSync(csvPath)) {
      throw new Error(`File CSV tidak ditemukan: ${csvPath}`)
    }
    const rows = parseCsv(csvPath)
    console.log(`📄 Membaca ${rows.length} baris dari coffee-shops.csv`)

    let processed = 0
    let skipped = 0
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const lineNum = i + 2
      if (row.name.startsWith('CONTOH')) {
        console.log(`   Skip baris ${lineNum}: CONTOH ${row.name}`)
        skipped++
        continue
      }
      try {
        validateRow(row, lineNum)
        await upsertCoffeeShop(row, owner.id, dryRun)
        processed++
      } catch (err) {
        console.error(`❌ Error baris ${lineNum}: ${(err as Error).message}`)
        throw err
      }
    }
    console.log(`✅ Coffee shop diproses: ${processed}, dikip: ${skipped}`)

    await seedMenus(owner.id, dryRun)

    if (!dryRun) {
      await printCounts()
    } else {
      console.log('\n🔍 DRY-RUN selesai. Tidak ada data yang ditulis.')
    }
  } catch (err) {
    console.error('❌ Seed gagal:', (err as Error).message)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()