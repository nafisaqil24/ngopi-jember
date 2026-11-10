import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import { app } from './app.js'
import { prisma } from './lib/prisma.js'
import { createTestAdmin, deleteTestUser } from './test/helpers.js'

const basePayload = (name: string, slugHint: string) => ({
  name,
  description: `Kedai uji jadwal per hari (${slugHint})`,
  address: 'Jl. Uji Jadwal No. 1',
  district: 'Sumbersari',
  priceRange: 'Rp15rb-30rb',
  latitude: -8.1715,
  longitude: 113.729,
})

const weeklyEntries = [
  { dayOfWeek: 0, open: '09:00', close: '03:30', isClosed: false },
  { dayOfWeek: 1, open: '07:00', close: '23:00', isClosed: false },
  { dayOfWeek: 2, open: '07:00', close: '23:00', isClosed: false },
  { dayOfWeek: 3, open: '07:00', close: '23:00', isClosed: false },
  { dayOfWeek: 4, open: '07:00', close: '00:00', isClosed: false },
  { dayOfWeek: 5, open: '07:00', close: '00:00', isClosed: false },
  { dayOfWeek: 6, open: '09:00', close: '03:30', isClosed: false },
]

const replacedEntries = weeklyEntries.map((entry) =>
  entry.dayOfWeek === 2
    ? { dayOfWeek: 2, isClosed: true }
    : { ...entry, open: '08:00', close: '20:00' }
)

const EXPECTED_SUMMARY = 'Sen-Rab 07:00-23:00, Kam-Jum 07:00-00:00, Sab-Min 09:00-03:30'
const REPLACED_SUMMARY = 'Sen 08:00-20:00, Sel tutup, Rab-Min 08:00-20:00'

describe('API jadwal per hari (OpeningHour)', () => {
  let adminCredentials: { id: string; email: string; password: string } | null = null
  let adminToken = ''
  let owner1Token = ''
  let owner2Token = ''
  let owner1Email = ''
  let owner2Email = ''
  let shopId = ''
  let shopSlug = ''
  let legacyShopId = ''
  const createdShopIds: string[] = []

  beforeAll(async () => {
    adminCredentials = await createTestAdmin()
    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: adminCredentials!.email, password: adminCredentials!.password })
    adminToken = adminLogin.body.data.token

    owner1Email = `owner_hours_1_${Date.now()}_${Math.random().toString(36).slice(2, 6)}@ngopijember.test`
    owner2Email = `owner_hours_2_${Date.now()}_${Math.random().toString(36).slice(2, 6)}@ngopijember.test`

    const reg1 = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Owner Hours 1', email: owner1Email, password: 'Password123!', role: 'OWNER' })
    expect(reg1.status).toBe(201)
    owner1Token = reg1.body.data.token

    const reg2 = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Owner Hours 2', email: owner2Email, password: 'Password123!', role: 'OWNER' })
    expect(reg2.status).toBe(201)
    owner2Token = reg2.body.data.token

    const created = await request(app)
      .post('/api/coffee-shops')
      .set('Authorization', `Bearer ${owner1Token}`)
      .send({
        ...basePayload('Kedai Jadwal API', 'utama'),
        openingHourEntries: weeklyEntries,
      })
    expect(created.status).toBe(201)
    shopId = created.body.data.id
    shopSlug = created.body.data.slug
    createdShopIds.push(shopId)
  }, 25000)

  afterAll(async () => {
    try {
      if (createdShopIds.length > 0) {
        await prisma.coffeeShop.deleteMany({ where: { id: { in: createdShopIds } } })
      }
      if (owner1Email) await deleteTestUser(owner1Email)
      if (owner2Email) await deleteTestUser(owner2Email)
      if (adminCredentials) await deleteTestUser(adminCredentials.email)
    } catch (err) {
      console.error('Opening hours API test cleanup error:', err)
    }
  })

  it('create dengan 7 entri menyimpan 7 baris + mengisi openingHours summary', async () => {
    expect(shopId).toBeTruthy()

    const data = await prisma.coffeeShop.findUnique({
      where: { id: shopId },
      select: { openingHours: true, openingHourEntries: { orderBy: { dayOfWeek: 'asc' } } },
    })
    expect(data?.openingHours).toBe(EXPECTED_SUMMARY)
    expect(data?.openingHourEntries).toHaveLength(7)
    expect(data?.openingHourEntries.map((entry) => entry.dayOfWeek)).toEqual([0, 1, 2, 3, 4, 5, 6])
    expect(data?.openingHourEntries[1]).toMatchObject({ openMinutes: 420, closeMinutes: 1380, isClosed: false })
    expect(data?.openingHourEntries[4]).toMatchObject({ openMinutes: 420, closeMinutes: 1440, isClosed: false })
    expect(data?.openingHourEntries[6]).toMatchObject({ openMinutes: 540, closeMinutes: 1650, isClosed: false })
  })

  it('update mengganti seluruh jadwal (tetap 7 baris)', async () => {
    const res = await request(app)
      .put(`/api/coffee-shops/${shopId}`)
      .set('Authorization', `Bearer ${owner1Token}`)
      .send({ openingHourEntries: replacedEntries })

    expect(res.status).toBe(200)
    expect(res.body.data.openingHours).toBe(REPLACED_SUMMARY)
    expect(res.body.data.openingHourEntries).toHaveLength(7)
    expect(res.body.data.openingHourEntries.map((entry: any) => entry.dayOfWeek)).toEqual([1, 2, 3, 4, 5, 6, 0])
    expect(res.body.data.openingHourEntries[1]).toMatchObject({ isClosed: true })

    const rows = await prisma.openingHour.findMany({ where: { coffeeShopId: shopId } })
    expect(rows).toHaveLength(7)
    expect(rows.filter((row) => row.dayOfWeek === 2)[0]).toMatchObject({
      openMinutes: 0,
      closeMinutes: 0,
      isClosed: true,
    })
    expect(rows.filter((row) => row.dayOfWeek === 1)[0]).toMatchObject({
      openMinutes: 480,
      closeMinutes: 1200,
      isClosed: false,
    })
  })

  it('validasi menolak kurang dari 7 entri', async () => {
    const res = await request(app)
      .post('/api/coffee-shops')
      .set('Authorization', `Bearer ${owner1Token}`)
      .send({
        ...basePayload('Jadwal Kurang Entri', 'kurang'),
        openingHourEntries: weeklyEntries.slice(0, 6),
      })
    expect(res.status).toBe(400)
    expect(res.body.success).toBe(false)
  })

  it('validasi menolak dayOfWeek duplikat', async () => {
    const duplicate = weeklyEntries.map((entry, index) =>
      index === 1 ? { ...entry, dayOfWeek: 0 } : entry
    )
    const res = await request(app)
      .post('/api/coffee-shops')
      .set('Authorization', `Bearer ${owner1Token}`)
      .send({
        ...basePayload('Jadwal Duplikat', 'duplikat'),
        openingHourEntries: duplicate,
      })
    expect(res.status).toBe(400)
    expect(res.body.success).toBe(false)
  })

  it('validasi menolak jam "25:00"', async () => {
    const invalid = weeklyEntries.map((entry, index) =>
      index === 1 ? { ...entry, close: '25:00' } : entry
    )
    const res = await request(app)
      .post('/api/coffee-shops')
      .set('Authorization', `Bearer ${owner1Token}`)
      .send({
        ...basePayload('Jadwal Jam Invalid', 'invalid'),
        openingHourEntries: invalid,
      })
    expect(res.status).toBe(400)
    expect(res.body.success).toBe(false)
  })

  it('validasi menolak open kosong saat isClosed false', async () => {
    const invalid = weeklyEntries.map((entry, index) =>
      index === 1 ? { ...entry, open: '', isClosed: false } : entry
    )
    const res = await request(app)
      .post('/api/coffee-shops')
      .set('Authorization', `Bearer ${owner1Token}`)
      .send({
        ...basePayload('Jadwal Open Kosong', 'kosong'),
        openingHourEntries: invalid,
      })
    expect(res.status).toBe(400)
    expect(res.body.success).toBe(false)
  })

  it('owner lain tidak bisa mengubah jadwal -> 403', async () => {
    const res = await request(app)
      .put(`/api/coffee-shops/${shopId}`)
      .set('Authorization', `Bearer ${owner2Token}`)
      .send({ openingHourEntries: weeklyEntries })
    expect(res.status).toBe(403)
    expect(res.body.success).toBe(false)

    const rows = await prisma.openingHour.findMany({ where: { coffeeShopId: shopId } })
    expect(rows).toHaveLength(7)
  })

  it('klien lama (hanya string openingHours) tetap sukses tanpa baris OpeningHour', async () => {
    const res = await request(app)
      .post('/api/coffee-shops')
      .set('Authorization', `Bearer ${owner2Token}`)
      .send({
        ...basePayload('Kedai String Lama', 'legacy'),
        openingHours: '08.00-22.00',
      })
    expect(res.status).toBe(201)
    legacyShopId = res.body.data.id
    createdShopIds.push(legacyShopId)

    const data = await prisma.coffeeShop.findUnique({
      where: { id: legacyShopId },
      select: { openingHours: true, openingHourEntries: true },
    })
    expect(data?.openingHours).toBe('08.00-22.00')
    expect(data?.openingHourEntries).toHaveLength(0)
  })

  it('response detail publik memuat openingHourEntries + openStatus tanpa field sensitif', async () => {
    const verify = await request(app)
      .patch(`/api/admin/coffee-shops/${shopId}/verify`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ isVerified: true })
    expect(verify.status).toBe(200)

    const res = await request(app).get(`/api/coffee-shops/${shopSlug}`)
    expect(res.status).toBe(200)
    expect(res.body.data.openingHourEntries).toHaveLength(7)
    expect(res.body.data.openingHourEntries.map((entry: any) => entry.dayOfWeek)).toEqual([1, 2, 3, 4, 5, 6, 0])
    expect(res.body.data.openStatus).toMatch(/^(buka|tutup|tidak_diketahui)$/)
    expect(res.body.data.openingHours).toBe(REPLACED_SUMMARY)
    expect(res.body.data.ownerId).toBeUndefined()
    expect(res.body.data.subscription).toBeUndefined()
  })

  it('response admin detail dan owner memuat openingHourEntries + openStatus', async () => {
    const adminRes = await request(app)
      .get(`/api/admin/coffee-shops/${shopId}`)
      .set('Authorization', `Bearer ${adminToken}`)
    expect(adminRes.status).toBe(200)
    expect(adminRes.body.data.openingHourEntries).toHaveLength(7)
    expect(adminRes.body.data.openStatus).toMatch(/^(buka|tutup|tidak_diketahui)$/)

    const ownerRes = await request(app)
      .get('/api/owner/coffee-shop')
      .set('Authorization', `Bearer ${owner1Token}`)
    expect(ownerRes.status).toBe(200)
    expect(ownerRes.body.data.openingHourEntries).toHaveLength(7)
    expect(ownerRes.body.data.openStatus).toMatch(/^(buka|tutup|tidak_diketahui)$/)
  })
})