import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import { app } from './app.js'
import { createTestAdmin, deleteTestUser } from './test/helpers.js'
import { prisma } from './lib/prisma.js'

describe('Analytics Event Tracking', () => {
  let adminCredentials: { id: string; email: string; password: string } | null = null
  let adminToken = ''
  let owner1Token = ''
  let owner2Token = ''
  let shopId1 = ''
  let shopId2 = ''
  const createdEmails: string[] = []

  beforeAll(async () => {
    adminCredentials = await createTestAdmin()
    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: adminCredentials!.email, password: adminCredentials!.password })
    adminToken = adminLogin.body.data.token

    const owner1Email = `owner_analytics_1_${Date.now()}_${Math.random().toString(36).slice(2, 6)}@test.com`
    const owner2Email = `owner_analytics_2_${Date.now()}_${Math.random().toString(36).slice(2, 6)}@test.com`
    createdEmails.push(owner1Email, owner2Email)

    const reg1 = await request(app).post('/api/auth/register').send({ name: 'Owner 1', email: owner1Email, password: 'Password123!', role: 'OWNER' })
    owner1Token = reg1.body.data.token
    const reg2 = await request(app).post('/api/auth/register').send({ name: 'Owner 2', email: owner2Email, password: 'Password123!', role: 'OWNER' })
    owner2Token = reg2.body.data.token

    const create1 = await request(app)
      .post('/api/coffee-shops')
      .set('Authorization', `Bearer ${owner1Token}`)
      .send({
        name: 'Shop 1',
        description: 'Shop 1 description',
        address: 'Jl. Test 1',
        district: 'Sumbersari',
        priceRange: 'Rp15rb-30rb',
        openingHours: '08.00-22.00',
        latitude: -8.1721,
        longitude: 113.7008,
      })
    shopId1 = create1.body.data.id
    await request(app).patch(`/api/admin/coffee-shops/${shopId1}/verify`).set('Authorization', `Bearer ${adminToken}`).send({ isVerified: true })

    const create2 = await request(app)
      .post('/api/coffee-shops')
      .set('Authorization', `Bearer ${owner2Token}`)
      .send({
        name: 'Shop 2',
        description: 'Shop 2 description',
        address: 'Jl. Test 2',
        district: 'Kaliwates',
        priceRange: 'Rp15rb-30rb',
        openingHours: '08.00-22.00',
        latitude: -8.1721,
        longitude: 113.7008,
      })
    shopId2 = create2.body.data.id
    await request(app).patch(`/api/admin/coffee-shops/${shopId2}/verify`).set('Authorization', `Bearer ${adminToken}`).send({ isVerified: true })

    // Bersihkan event analitik lama untuk shop uji agar tes deterministik
    await prisma.analyticsEvent.deleteMany({ where: { coffeeShopId: { in: [shopId1, shopId2] } } })
  }, 15000)

  afterAll(async () => {
    try {
      for (const email of createdEmails) {
        await deleteTestUser(email)
      }
      if (adminCredentials) {
        await deleteTestUser(adminCredentials.email)
      }
    } catch (err) {
      console.error('Analytics test cleanup error:', err)
    }
  })

  it('POST /api/coffee-shops/:id/events - event valid → 201', async () => {
    const res = await request(app)
      .post(`/api/coffee-shops/${shopId1}/events`)
      .send({ eventType: 'PROFILE_VIEW' })
    expect(res.status).toBe(201)
    expect(res.body.success).toBe(true)
  })

  it('POST /api/coffee-shops/:id/events - eventType tidak valid → 400', async () => {
    const res = await request(app)
      .post(`/api/coffee-shops/${shopId1}/events`)
      .send({ eventType: 'INVALID_EVENT' })
    expect(res.status).toBe(400)
    expect(res.body.success).toBe(false)
  })

  it('POST /api/coffee-shops/:id/events - kedai tidak ada → 404', async () => {
    const res = await request(app)
      .post('/api/coffee-shops/cuid-nonexistent/events')
      .send({ eventType: 'PROFILE_VIEW' })
    expect(res.status).toBe(404)
    expect(res.body.success).toBe(false)
  })

  it('POST /api/coffee-shops/:id/events - kedai belum terverifikasi → 404', async () => {
    const createRes = await request(app)
      .post('/api/coffee-shops')
      .set('Authorization', `Bearer ${owner1Token}`)
      .send({
        name: 'Unverified Shop',
        description: 'Not verified',
        address: 'Jl. Test 3',
        district: 'Sumbersari',
        priceRange: 'Rp15rb-30rb',
        openingHours: '08.00-22.00',
        latitude: -8.1721,
        longitude: 113.7008,
      })
    const unverifiedId = createRes.body.data.id

    const res = await request(app)
      .post(`/api/coffee-shops/${unverifiedId}/events`)
      .send({ eventType: 'PROFILE_VIEW' })
    expect(res.status).toBe(404)
    expect(res.body.success).toBe(false)
  })

it('GET /api/owner/analytics - hanya menghitung kedai milik owner', async () => {
    await request(app).post(`/api/coffee-shops/${shopId1}/events`).send({ eventType: 'PROFILE_VIEW' })
    await request(app).post(`/api/coffee-shops/${shopId1}/events`).send({ eventType: 'MAP_CLICK' })
    await request(app).post(`/api/coffee-shops/${shopId2}/events`).send({ eventType: 'WHATSAPP_CLICK' })

    const res1 = await request(app).get('/api/owner/analytics').set('Authorization', `Bearer ${owner1Token}`)
    expect(res1.status).toBe(200)
    expect(res1.body.success).toBe(true)
    const events1 = res1.body.data.events
    // Gunakan >= karena bisa ada event dari run sebelumnya yang belum tersapu
    expect(events1.find((e: any) => e.eventType === 'PROFILE_VIEW')?.count).toBeGreaterThanOrEqual(1)
    expect(events1.find((e: any) => e.eventType === 'MAP_CLICK')?.count).toBeGreaterThanOrEqual(1)
    expect(events1.find((e: any) => e.eventType === 'WHATSAPP_CLICK')?.count).toBe(0)

    const res2 = await request(app).get('/api/owner/analytics').set('Authorization', `Bearer ${owner2Token}`)
    expect(res2.status).toBe(200)
    expect(res2.body.data.total).toBe(1)
    const events2 = res2.body.data.events
    expect(events2.find((e: any) => e.eventType === 'WHATSAPP_CLICK')?.count).toBe(1)
  })

  it('GET /api/owner/analytics - role USER → 403', async () => {
    const userEmail = `user_analytics_${Date.now()}_${Math.random().toString(36).slice(2, 6)}@test.com`
    createdEmails.push(userEmail)
    const userReg = await request(app).post('/api/auth/register').send({ name: 'User', email: userEmail, password: 'Password123!', role: 'USER' })
    const userToken = userReg.body.data.token

    const res = await request(app).get('/api/owner/analytics').set('Authorization', `Bearer ${userToken}`)
    expect(res.status).toBe(403)
    expect(res.body.success).toBe(false)
  })

  it('GET /api/owner/analytics - ?days tidak valid → 400', async () => {
    const res = await request(app).get('/api/owner/analytics?days=14').set('Authorization', `Bearer ${owner1Token}`)
    expect(res.status).toBe(400)
    expect(res.body.success).toBe(false)
  })

  it('GET /api/owner/analytics - default days=30 & days=7 bekerja', async () => {
    const res30 = await request(app).get('/api/owner/analytics').set('Authorization', `Bearer ${owner1Token}`)
    expect(res30.status).toBe(200)
    expect(res30.body.data.days).toBe(30)

    const res7 = await request(app).get('/api/owner/analytics?days=7').set('Authorization', `Bearer ${owner1Token}`)
    expect(res7.status).toBe(200)
    expect(res7.body.data.days).toBe(7)
  })

  it('GET /api/owner/analytics - mengembalikan semua 6 tipe event termasuk yang bernilai 0', async () => {
    const res = await request(app).get('/api/owner/analytics?days=30').set('Authorization', `Bearer ${owner1Token}`)
    expect(res.status).toBe(200)
    const events = res.body.data.events
    expect(events.length).toBe(6)
    // Urutan enum AnalyticsEventType (dari Prisma): INSTAGRAM_CLICK, MAP_CLICK, MENU_VIEW, PROMOTION_VIEW, PROFILE_VIEW, WHATSAPP_CLICK
    // Urutan alfabetis: INSTAGRAM_CLICK, MAP_CLICK, MENU_VIEW, PROFILE_VIEW, PROMOTION_VIEW, WHATSAPP_CLICK
    const types = events.map((e: any) => e.eventType).sort()
    expect(types).toEqual(['INSTAGRAM_CLICK', 'MAP_CLICK', 'MENU_VIEW', 'PROFILE_VIEW', 'PROMOTION_VIEW', 'WHATSAPP_CLICK'])
    events.forEach((e: any) => {
      expect(typeof e.count).toBe('number')
      expect(e.count).toBeGreaterThanOrEqual(0)
    })
  })
})