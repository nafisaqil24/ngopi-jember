import { PrismaClient, Prisma } from '@prisma/client'
import { parse } from 'csv-parse/sync'
import * as fs from 'fs'
import * as path from 'path'
import dotenv from 'dotenv'
import { buildOpeningHourRows } from './seed-kedai-validation.js'

const prisma = new PrismaClient()

const VALID_CATEGORIES = new Set([
  'Specialty Coffee',
  'Kopi Tradisional',
  'Kopi Susu Kekinian',
  'Cocok Buat WFH / Belajar',
  'Tempat Nongkrong',
  'Outdoor / Garden',
  'Live Music',
])

const VALID_FACILITIES = new Set([
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
])

const JEMBER_LAT_MIN = -8.6
const JEMBER_LAT_MAX = -7.8
const JEMBER_LNG_MIN = 113.2
const JEMBER_LNG_MAX = 114.2
const MIN_DECIMALS = 5

const CSV_PATH = path.join(__dirname, 'data', 'kedai-real.csv')

type ValidationResult<T> =
  | { ok: true; value: T; warning?: string }
  | { ok: false; error: string }

function isOk<T>(res: ValidationResult<T>): res is { ok: true; value: T; warning?: string } {
  return res.ok === true
}

function isErr<T>(res: ValidationResult<T>): res is { ok: false; error: string } {
  return res.ok === false
}

interface ParsedRow {
  name: string
  address: string
  district: string
  latitude: string
  longitude: string
  priceRange: string
  openingHours: string
  phone: string
  instagram: string
  description: string
  categories: string
  facilities: string
}

interface ValidatedRow {
  name: string
  slug: string
  address: string
  district: string
  latitude: number
  longitude: number
  priceRange: string
  openingHours: string
  phone?: string
  instagram?: string
  description: string
  categoryNames?: string[]
  facilityNames?: string[]
  warnings: string[]
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s/]+/g, '-')
    .replace(/-+/g, '-')
}

function uniqueSlug(base: string, existing: Set<string>): string {
  let slug = slugify(base)
  let counter = 1
  while (existing.has(slug)) {
    slug = `${slug}-${counter}`
    counter++
  }
  return slug
}

function normalizePhone(raw: string): string {
  let value = raw.replace(/[\s\-+]/g, '')
  if (value.startsWith('0')) value = '62' + value.slice(1)
  return value
}

function normalizeInstagram(raw: string): string {
  return raw.replace(/^@+/, '').trim()
}

export const validateAndNormalize = {
  slugify,
  uniqueSlug,
  priceRange(raw: string, lineNum: number): ValidationResult<{ min: number; max: number }> {
    const trimmed = raw.trim()
    if (trimmed === 'Belum tersedia') {
      return { ok: false, error: `Baris ${lineNum}: priceRange tidak boleh "Belum tersedia"` }
    }
    const match = trimmed.match(/^Rp(\d+)\s*-\s*Rp(\d+)$/)
    if (!match) {
      return { ok: false, error: `Baris ${lineNum}: priceRange format harus "Rp<angka> - Rp<angka>" (dapat: "${trimmed}")` }
    }
    const min = parseInt(match[1], 10)
    const max = parseInt(match[2], 10)
    if (min < 1000) {
      return { ok: false, error: `Baris ${lineNum}: harga termurah minimal 1000 (dapat: ${min}), kemungkinan salah baca singkatan harga` }
    }
    if (min > max) {
      return { ok: false, error: `Baris ${lineNum}: priceRange min (${min}) harus <= max (${max})` }
    }
    return { ok: true, value: { min, max } }
  },

  openingHours(raw: string, lineNum: number): ValidationResult<string> {
    const trimmed = raw.trim()
    if (trimmed === 'Belum tersedia') {
      return { ok: false, error: `Baris ${lineNum}: openingHours tidak boleh "Belum tersedia"` }
    }
    const normalized = trimmed.replace(/\s*-\s*/, ' - ')
    const match = normalized.match(/^(\d{2}):(\d{2}) - (\d{2}):(\d{2})$/)
    if (!match) {
      return { ok: false, error: `Baris ${lineNum}: openingHours format harus "HH:MM - HH:MM" (dapat: "${trimmed}")` }
    }
    const h1 = parseInt(match[1], 10)
    const m1 = parseInt(match[2], 10)
    const h2 = parseInt(match[3], 10)
    const m2 = parseInt(match[4], 10)
    if (h1 > 23 || m1 > 59 || h2 > 23 || m2 > 59) {
      return { ok: false, error: `Baris ${lineNum}: jam/menit tidak valid` }
    }
    return { ok: true, value: normalized }
  },

  coordinates(latRaw: string, lngRaw: string, lineNum: number): ValidationResult<{ latitude: number; longitude: number }> {
    const latTrimmed = latRaw.trim()
    const lngTrimmed = lngRaw.trim()
    const latFilled = latTrimmed !== ''
    const lngFilled = lngTrimmed !== ''

    if (latFilled !== lngFilled) {
      return { ok: false, error: `Baris ${lineNum}: latitude dan longitude harus diisi keduanya atau dikosongkan keduanya` }
    }
    if (!latFilled && !lngFilled) {
      return { ok: false, error: `Baris ${lineNum}: koordinat wajib diisi` }
    }

    const lat = parseFloat(latTrimmed)
    const lng = parseFloat(lngTrimmed)
    if (isNaN(lat) || isNaN(lng)) {
      return { ok: false, error: `Baris ${lineNum}: latitude/longitude bukan angka valid` }
    }
    if (lat < JEMBER_LAT_MIN || lat > JEMBER_LAT_MAX || lng < JEMBER_LNG_MIN || lng > JEMBER_LNG_MAX) {
      return { ok: false, error: `Baris ${lineNum}: koordinat di luar wilayah Jember (lat ${JEMBER_LAT_MIN}..${JEMBER_LAT_MAX}, lng ${JEMBER_LNG_MIN}..${JEMBER_LNG_MAX})` }
    }

    const latDecimals = latTrimmed.includes('.') ? latTrimmed.split('.')[1].replace(/[^0-9]/g, '').length : 0
    const lngDecimals = lngTrimmed.includes('.') ? lngTrimmed.split('.')[1].replace(/[^0-9]/g, '').length : 0
    let warning: string | undefined
    if (latDecimals < MIN_DECIMALS || lngDecimals < MIN_DECIMALS) {
      warning = `Baris ${lineNum}: koordinat presisi rendah (lat ${latDecimals} desimal, lng ${lngDecimals} desimal, disarankan >= ${MIN_DECIMALS})`
    }
    return { ok: true, value: { latitude: lat, longitude: lng }, warning }
  },

  phone(raw: string, lineNum: number): ValidationResult<string | undefined> {
    const trimmed = raw.trim()
    if (trimmed === '') return { ok: true, value: undefined }
    const normalized = normalizePhone(trimmed)
    if (!/^\d+$/.test(normalized) || normalized.length < 10) {
      return { ok: false, error: `Baris ${lineNum}: phone tidak berisi digit valid setelah normalisasi` }
    }
    return { ok: true, value: normalized }
  },

  instagram(raw: string, lineNum: number): ValidationResult<string | undefined> {
    const trimmed = raw.trim()
    if (trimmed === '') return { ok: true, value: undefined }
    const normalized = normalizeInstagram(trimmed)
    if (normalized === '') {
      return { ok: false, error: `Baris ${lineNum}: instagram hanya berisi "@"` }
    }
    return { ok: true, value: normalized }
  },

  refs(raw: string, validSet: Set<string>, label: string, lineNum: number): ValidationResult<string[] | undefined> {
    const trimmed = raw.trim()
    if (trimmed === '') return { ok: true, value: undefined }
    const names = trimmed
      .split('|')
      .map((part) => part.trim())
      .filter((part) => part.length > 0)
    if (names.length === 0) {
      return { ok: false, error: `Baris ${lineNum}: kolom ${label} tidak berisi nama valid` }
    }
    const deduped = Array.from(new Set(names))
    for (const name of deduped) {
      if (!validSet.has(name)) {
        return { ok: false, error: `Baris ${lineNum}: ${label} "${name}" tidak ada di daftar valid` }
      }
    }
    return { ok: true, value: deduped }
  },
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

function maskUrl(url: string): string {
  return url.replace(/:([^:@]+)@/, ':****@')
}

function getHost(url?: string): string {
  if (!url) return ''
  const m = url.match(/@([^:/?]+)/)
  if (!m) return ''
  return m[1].replace(/-pooler$/, '')
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

async function upsertOpeningHours(
  tx: Prisma.TransactionClient,
  coffeeShopId: string,
  openingHours: string
): Promise<number> {
  const rows = buildOpeningHourRows(openingHours)
  if (!rows) return 0

  for (const row of rows) {
    await tx.openingHour.upsert({
      where: {
        coffeeShopId_dayOfWeek: {
          coffeeShopId,
          dayOfWeek: row.dayOfWeek,
        },
      },
      update: {
        openMinutes: row.openMinutes,
        closeMinutes: row.closeMinutes,
        isClosed: row.isClosed,
      },
      create: {
        coffeeShopId,
        dayOfWeek: row.dayOfWeek,
        openMinutes: row.openMinutes,
        closeMinutes: row.closeMinutes,
        isClosed: row.isClosed,
      },
    })
  }

  return rows.length
}

async function main() {
  const TARGET_HOST = loadTestEnvOrExit()

  const apply = process.argv.includes('--confirm')

  console.log('')
  console.log('=== SEED KEDAI REAL (dari CSV) ===')
  console.log(`Mode: ${apply ? 'EKSEKUSI (--confirm)' : 'DRY-RUN (tidak menulis)'}`)
  console.log(`Host: ${TARGET_HOST}`)
  console.log(`CSV: ${CSV_PATH}`)
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
  }) as Array<{
    name: string
    address: string
    district: string
    latitude: string
    longitude: string
    priceRange: string
    openingHours: string
    phone: string
    instagram: string
    description: string
    categories: string
    facilities: string
  }>

  if (records.length === 0) {
    console.log('ℹ️  CSV kosong. Tidak ada yang diproses.')
    await prisma.$disconnect()
    process.exit(0)
  }

  console.log(`Ditemukan ${records.length} baris data kedai`)
  console.log('')

  // --- VALIDASI SEMUA BARIS ---
  const validatedRows: ValidatedRow[] = []
  const allErrors: string[] = []
  const allWarnings: string[] = []
  const existingSlugs = new Set<string>()

  // Ambil slug yang sudah ada di DB
  const existingShops = await prisma.coffeeShop.findMany({ select: { slug: true } })
  existingShops.forEach((s) => existingSlugs.add(s.slug))

  for (let i = 0; i < records.length; i++) {
    const row = records[i]
    const lineNum = i + 2 // baris 1 = header
    const warnings: string[] = []

    const name = row.name.trim()
    if (!name || name.length < 3 || name.length > 120) {
      allErrors.push(`Baris ${lineNum}: name wajib 3-120 karakter (dapat: "${name}")`)
      continue
    }

    const address = row.address.trim()
    if (!address || address.length < 5 || address.length > 200) {
      allErrors.push(`Baris ${lineNum}: address wajib 5-200 karakter`)
      continue
    }

    const district = row.district.trim()
    if (!district || district.length < 2 || district.length > 80) {
      allErrors.push(`Baris ${lineNum}: district wajib 2-80 karakter`)
      continue
    }

    const description = row.description.trim()
    if (!description || description.length < 10 || description.length > 2000) {
      allErrors.push(`Baris ${lineNum}: description wajib 10-2000 karakter`)
      continue
    }

    const priceRes = validateAndNormalize.priceRange(row.priceRange, lineNum)
    if (isErr(priceRes)) { allErrors.push(priceRes.error); continue }

    const hoursRes = validateAndNormalize.openingHours(row.openingHours, lineNum)
    if (isErr(hoursRes)) { allErrors.push(hoursRes.error); continue }
    if (hoursRes.warning) warnings.push(hoursRes.warning)

    const coordRes = validateAndNormalize.coordinates(row.latitude, row.longitude, lineNum)
    if (isErr(coordRes)) { allErrors.push(coordRes.error); continue }
    if (coordRes.warning) warnings.push(coordRes.warning)

    const phoneRes = validateAndNormalize.phone(row.phone, lineNum)
    if (isErr(phoneRes)) { allErrors.push(phoneRes.error); continue }

    const instaRes = validateAndNormalize.instagram(row.instagram, lineNum)
    if (isErr(instaRes)) { allErrors.push(instaRes.error); continue }

    const catRes = validateAndNormalize.refs(row.categories, VALID_CATEGORIES, 'kategori', lineNum)
    if (isErr(catRes)) { allErrors.push(catRes.error); continue }

    const facRes = validateAndNormalize.refs(row.facilities, VALID_FACILITIES, 'fasilitas', lineNum)
    if (isErr(facRes)) { allErrors.push(facRes.error); continue }

    const baseSlug = slugify(name)
    const finalSlug = uniqueSlug(baseSlug, existingSlugs)
    existingSlugs.add(finalSlug)

    validatedRows.push({
      name,
      slug: finalSlug,
      address,
      district,
      latitude: coordRes.value.latitude,
      longitude: coordRes.value.longitude,
      priceRange: row.priceRange.trim(),
      openingHours: hoursRes.value,
      phone: phoneRes.value,
      instagram: instaRes.value,
      description,
      categoryNames: catRes.value,
      facilityNames: facRes.value,
      warnings,
    })
    allWarnings.push(...warnings)
  }

  if (allErrors.length > 0) {
    console.error('❌ Validasi gagal (tidak ada yang ditulis):')
    allErrors.forEach((e) => console.error(`   - ${e}`))
    await prisma.$disconnect()
    process.exit(1)
  }

  if (allWarnings.length > 0) {
    console.log('⚠️  WARNING:')
    allWarnings.forEach((w) => console.log(`   - ${w}`))
    console.log('')
  }

  // --- TENTUKAN OWNER ---
  let ownerId: string
  const seedOwnerEmail = process.env.SEED_OWNER_EMAIL
  if (seedOwnerEmail) {
    console.log('🔑 SEED_OWNER_EMAIL tersedia, mencari user...')
    const owner = await prisma.user.findUnique({ where: { email: seedOwnerEmail } })
    if (!owner || owner.role !== 'OWNER') {
      console.error(`❌ User dengan email SEED_OWNER_EMAIL tidak ditemukan atau bukan OWNER`)
      await prisma.$disconnect()
      process.exit(1)
    }
    ownerId = owner.id
    console.log(`   Owner: ${seedOwnerEmail.replace(/(.{2}).*(@.*)/, '$1***$2')} (ID: ${ownerId})`)
  } else {
    console.log('🔍 Mencari user OWNER asli di DB test (bukan @ngopijember.test)...')
    const owners = await prisma.user.findMany({
      where: { role: 'OWNER', email: { not: { endsWith: '@ngopijember.test' } } },
      select: { id: true, email: true },
    })
    if (owners.length === 0) {
      console.error('❌ Tidak ada user OWNER asli di DB test (semua berakhiran @ngopijember.test atau tidak ada OWNER)')
      await prisma.$disconnect()
      process.exit(1)
    }
    if (owners.length > 1) {
      console.error('❌ Lebih dari satu user OWNER asli ditemukan, ambigu. Set SEED_OWNER_EMAIL di .env.test')
      owners.forEach((o) => console.error(`   - ${o.email.replace(/(.{2}).*(@.*)/, '$1***$2')}`))
      await prisma.$disconnect()
      process.exit(1)
    }
    ownerId = owners[0].id
    console.log(`   Owner: ${owners[0].email.replace(/(.{2}).*(@.*)/, '$1***$2')} (ID: ${ownerId})`)
  }

  // --- CEK KEDAI YANG SUDAH ADA ---
  const slugs = validatedRows.map((r) => r.slug)
  const existing = await prisma.coffeeShop.findMany({
    where: { slug: { in: slugs } },
    select: { id: true, slug: true },
  })
  const existingMap = new Map(existing.map((s) => [s.slug, s.id]))

  let toCreate = 0
  let toUpdate = 0

  interface Plan {
    row: ValidatedRow
    shopId?: string
    action: 'create' | 'update'
    createData?: Prisma.CoffeeShopCreateInput
    updateData?: Prisma.CoffeeShopUpdateInput
    categoryIds?: string[]
    facilityIds?: string[]
  }

  const plans: Plan[] = []

  // Resolve kategori/fasilitas ke ID
  const allCatNames = Array.from(new Set(validatedRows.flatMap((r) => r.categoryNames ?? [])))
  const allFacNames = Array.from(new Set(validatedRows.flatMap((r) => r.facilityNames ?? [])))

  const catRecords = allCatNames.length
    ? await prisma.category.findMany({ where: { name: { in: allCatNames } } })
    : []
  const facRecords = allFacNames.length
    ? await prisma.facility.findMany({ where: { name: { in: allFacNames } } })
    : []

  const catIdByName = new Map(catRecords.map((c) => [c.name, c.id]))
  const facIdByName = new Map(facRecords.map((f) => [f.name, f.id]))

  for (const row of validatedRows) {
    const existingId = existingMap.get(row.slug)
    const categoryIds = row.categoryNames?.map((n) => catIdByName.get(n)!)
    const facilityIds = row.facilityNames?.map((n) => facIdByName.get(n)!)

    if (existingId) {
      // UPDATE - hanya field yang ada di CSV, JANGAN sentuh ownerId, status, isVerified, isFeatured
      const updateData: Prisma.CoffeeShopUpdateInput = {
        name: row.name,
        address: row.address,
        district: row.district,
        latitude: row.latitude,
        longitude: row.longitude,
        priceRange: row.priceRange,
        openingHours: row.openingHours,
        description: row.description,
        phone: row.phone ?? undefined,
        instagram: row.instagram ?? undefined,
      }
      if (categoryIds !== undefined) {
        updateData.categories = { deleteMany: {}, create: categoryIds.map((id) => ({ categoryId: id })) }
      }
      if (facilityIds !== undefined) {
        updateData.facilities = { deleteMany: {}, create: facilityIds.map((id) => ({ facilityId: id })) }
      }
      plans.push({ row, shopId: existingId, action: 'update', updateData, categoryIds, facilityIds })
      toUpdate++
    } else {
      // CREATE
      const createData: Prisma.CoffeeShopCreateInput = {
        name: row.name,
        slug: row.slug,
        address: row.address,
        district: row.district,
        latitude: row.latitude,
        longitude: row.longitude,
        priceRange: row.priceRange,
        openingHours: row.openingHours,
        description: row.description,
        phone: row.phone,
        instagram: row.instagram,
        owner: { connect: { id: ownerId } },
        status: 'OPEN',
        isVerified: true,
        isFeatured: false,
        categories: categoryIds ? { create: categoryIds.map((id) => ({ categoryId: id })) } : undefined,
        facilities: facilityIds ? { create: facilityIds.map((id) => ({ facilityId: id })) } : undefined,
      }
      plans.push({ row, action: 'create', createData, categoryIds, facilityIds })
      toCreate++
    }
  }

  console.log('=== PREVIEW PERUBAHAN ===')
  for (const plan of plans) {
    console.log(`\n${plan.row.name} (${plan.row.slug})`)
    console.log(`  Aksi: ${plan.action}`)
    console.log(`  Kategori: ${plan.categoryIds?.length ?? 0}`)
    console.log(`  Fasilitas: ${plan.facilityIds?.length ?? 0}`)
    console.log(`  OpeningHour: ${buildOpeningHourRows(plan.row.openingHours)?.length ?? 0} baris`)
    if (plan.row.warnings.length) plan.row.warnings.forEach((w) => console.log(`  ⚠️  ${w}`))
  }

  console.log('')
  console.log(`Total: ${toCreate} create, ${toUpdate} update`)
  console.log('')

  if (!apply) {
    console.log('⚠️  PREVIEW saja. Untuk menulis, jalankan: npx tsx prisma/seed-kedai-real.ts --confirm')
    await prisma.$disconnect()
    process.exit(0)
  }

  // --- EKSEKUSI ---
  console.log('✍️  Menulis data...')

  const beforeCounts = await getTableCounts()
  console.log('Row count SEBELUM:', beforeCounts)

  await prisma.$transaction(async (tx) => {
    for (const plan of plans) {
      if (plan.action === 'create') {
        const created = await tx.coffeeShop.create({ data: plan.createData! })
        await upsertOpeningHours(tx, created.id, plan.row.openingHours)
      } else if (plan.action === 'update') {
        await tx.coffeeShop.update({ where: { id: plan.shopId! }, data: plan.updateData! })
        await upsertOpeningHours(tx, plan.shopId!, plan.row.openingHours)
      }
    }
  })

  const afterCounts = await getTableCounts()
  console.log('Row count SESUDAH:', afterCounts)

  console.log('')
  console.log('✅ Seed kedai real selesai.')

  await prisma.$disconnect()
}

async function getTableCounts(): Promise<Record<string, number>> {
  return {
    CoffeeShop: await prisma.coffeeShop.count(),
    Category: await prisma.category.count(),
    Facility: await prisma.facility.count(),
    CoffeeShopCategory: await prisma.coffeeShopCategory.count(),
    CoffeeShopFacility: await prisma.coffeeShopFacility.count(),
    OpeningHour: await prisma.openingHour.count(),
  }
}

main()
  .catch(async (e) => {
    console.error('❌ Error:', e)
    await prisma.$disconnect()
    process.exit(1)
  })