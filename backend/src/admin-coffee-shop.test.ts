import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import { app } from './app.js'
import { createTestAdmin, deleteTestUser } from './test/helpers.js'

// Test mandiri (self-cleaning, idempoten) untuk fitur ADMIN mengelola kedai:
// - GET /api/admin/coffee-shops/:id (detail lengkap, termasuk kedai belum terverifikasi)
// - admin boleh PUT kedai milik owner lain
// - validasi bounding box Jember pada create & update
// - admin boleh kelola menu di kedai milik owner lain
describe('Admin Coffee Shop CRUD', () => {
  let adminCredentials: { id: string; email: string; password: string } | null = null
  let adminToken = ''
  let owner1Token = ''
  let owner1Id = ''
  let owner1Email = ''
  let owner2Token = ''
  let owner2Email = ''
  let shopId = '' // milik owner1, isVerified=false
  const createdEmails: string[] = []

  beforeAll(async () => {
    adminCredentials = await createTestAdmin()
    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: adminCredentials!.email, password: adminCredentials!.password })
    adminToken = adminLogin.body.data.token

    owner1Email = `owner_admin1_${Date.now()}_${Math.random().toString(36).slice(2, 6)}@ngopijember.test`
    owner2Email = `owner_admin2_${Date.now()}_${Math.random().toString(36).slice(2, 6)}@ngopijember.test`
    createdEmails.push(owner1Email, owner2Email)

    const reg1 = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Admin Owner 1', email: owner1Email, password: 'Password123!', role: 'OWNER' })
    expect(reg1.status).toBe(201)
    owner1Token = reg1.body.data.token
    owner1Id = reg1.body.data.user.id

    const reg2 = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Admin Owner 2', email: owner2Email, password: 'Password123!', role: 'OWNER' })
    expect(reg2.status).toBe(201)
    owner2Token = reg2.body.data.token

    // Kedai milik owner1, sengaja TIDAK diverifikasi admin.
    const create = await request(app)
      .post('/api/coffee-shops')
      .set('Authorization', `Bearer ${owner1Token}`)
      .send({
        name: 'Admin Edit Cafe',
        description: 'Kedai untuk uji admin mengelola data',
        address: 'Jl. Admin No. 1',
        district: 'Sumbersari',
        priceRange: 'Rp15rb-30rb',
        openingHours: '08.00-22.00',
        latitude: -8.1721,
        longitude: 113.7008,
      })
    expect(create.status).toBe(201)
    shopId = create.body.data.id

    // Isi kategori + fasilitas + menu supaya detail lengkap benar-benar teruji.
    const facilities = await request(app).get('/api/facilities')
    const categories = await request(app).get('/api/categories')
    await request(app)
      .put(`/api/coffee-shops/${shopId}/taxonomy`)
      .set('Authorization', `Bearer ${owner1Token}`)
      .send({
        categoryIds: [categories.body.data[0].id],
        facilityIds: [facilities.body.data[0].id],
      })
    await request(app)
      .post(`/api/coffee-shops/${shopId}/menus`)
      .set('Authorization', `Bearer ${owner1Token}`)
      .send({ name: 'Kopi Admin', price: 18000, category: 'Coffee' })
  }, 20000)

  afterAll(async () => {
    try {
      for (const email of createdEmails) {
        await deleteTestUser(email)
      }
      if (adminCredentials) {
        await deleteTestUser(adminCredentials.email)
      }
    } catch (err) {
      console.error('Admin coffee shop test cleanup error:', err)
    }
  })

  it('a. admin GET /api/admin/coffee-shops/:id mengembalikan data lengkap (kedai belum terverifikasi)', async () => {
    const res = await request(app)
      .get(`/api/admin/coffee-shops/${shopId}`)
      .set('Authorization', `Bearer ${adminToken}`)

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    const data = res.body.data
    expect(data.id).toBe(shopId)
    expect(data.isVerified).toBe(false)
    expect(Array.isArray(data.categories)).toBe(true)
    expect(data.categories.length).toBeGreaterThanOrEqual(1)
    expect(Array.isArray(data.facilities)).toBe(true)
    expect(data.facilities.length).toBeGreaterThanOrEqual(1)
    expect(Array.isArray(data.images)).toBe(true)
    expect(Array.isArray(data.menus)).toBe(true)
    expect(data.menus.length).toBeGreaterThanOrEqual(1)
    expect(data.owner.id).toBe(owner1Id)
    expect(data.owner.name).toBe('Admin Owner 1')
    expect(data.owner.email).toBe(owner1Email)
  })

  it('b. admin GET id tidak ada mengembalikan 404 dengan pesan kedai tidak ditemukan', async () => {
    const res = await request(app)
      .get('/api/admin/coffee-shops/cuid-tidak-ada')
      .set('Authorization', `Bearer ${adminToken}`)

    expect(res.status).toBe(404)
    expect(res.body.success).toBe(false)
    expect(res.body.message).toBe('Coffee shop tidak ditemukan')
  })

  it('c. non-admin (OWNER) mengakses endpoint detail admin -> 403, tanpa token -> 401', async () => {
    const forbidden = await request(app)
      .get(`/api/admin/coffee-shops/${shopId}`)
      .set('Authorization', `Bearer ${owner1Token}`)
    expect(forbidden.status).toBe(403)
    expect(forbidden.body.success).toBe(false)

    const unauthorized = await request(app).get(`/api/admin/coffee-shops/${shopId}`)
    expect(unauthorized.status).toBe(401)
    expect(unauthorized.body.success).toBe(false)
  })

  it('d. admin PUT kedai milik owner lain -> 200, owner lain -> 403', async () => {
    const adminUpdate = await request(app)
      .put(`/api/coffee-shops/${shopId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ description: 'Diubah oleh admin untuk pengujian' })
    expect(adminUpdate.status).toBe(200)
    expect(adminUpdate.body.data.description).toBe('Diubah oleh admin untuk pengujian')

    const foreignOwner = await request(app)
      .put(`/api/coffee-shops/${shopId}`)
      .set('Authorization', `Bearer ${owner2Token}`)
      .send({ description: 'Coba ubah kedai orang lain' })
    expect(foreignOwner.status).toBe(403)
    expect(foreignOwner.body.success).toBe(false)
  })

  it('e1. create menolak latitude di luar Jember -> 400', async () => {
    const res = await request(app)
      .post('/api/coffee-shops')
      .set('Authorization', `Bearer ${owner1Token}`)
      .send({
        name: 'Luar Jember Lat',
        description: 'Deskripsi cukup panjang',
        address: 'Jl. Test',
        district: 'Sumbersari',
        priceRange: 'Rp15rb-30rb',
        openingHours: '08.00-22.00',
        latitude: -9.5,
        longitude: 113.7008,
      })
    expect(res.status).toBe(400)
    expect(res.body.success).toBe(false)
  })

  it('e2. create menolak longitude di luar Jember -> 400', async () => {
    const res = await request(app)
      .post('/api/coffee-shops')
      .set('Authorization', `Bearer ${owner1Token}`)
      .send({
        name: 'Luar Jember Lng',
        description: 'Deskripsi cukup panjang',
        address: 'Jl. Test',
        district: 'Sumbersari',
        priceRange: 'Rp15rb-30rb',
        openingHours: '08.00-22.00',
        latitude: -8.1721,
        longitude: 115.5,
      })
    expect(res.status).toBe(400)
    expect(res.body.success).toBe(false)
  })

  it('e3. create menolak bila hanya salah satu dari lat/lng diisi -> 400', async () => {
    const res = await request(app)
      .post('/api/coffee-shops')
      .set('Authorization', `Bearer ${owner1Token}`)
      .send({
        name: 'Hanya Lat',
        description: 'Deskripsi cukup panjang',
        address: 'Jl. Test',
        district: 'Sumbersari',
        priceRange: 'Rp15rb-30rb',
        openingHours: '08.00-22.00',
        latitude: -8.1721,
      })
    expect(res.status).toBe(400)
    expect(res.body.success).toBe(false)
  })

  it('e4. create lolos bila koordinat kosong / tidak dikirim (kedai tanpa koordinat) -> 201', async () => {
    const res = await request(app)
      .post('/api/coffee-shops')
      .set('Authorization', `Bearer ${owner1Token}`)
      .send({
        name: 'Tanpa Koordinat',
        description: 'Deskripsi cukup panjang',
        address: 'Jl. Test',
        district: 'Sumbersari',
        priceRange: 'Rp15rb-30rb',
        openingHours: '08.00-22.00',
      })
    expect(res.status).toBe(201)
    expect(res.body.success).toBe(true)
    expect(res.body.data.latitude).toBeNull()
    expect(res.body.data.longitude).toBeNull()
  })

  it('e5. create lolos bila koordinat valid di Jember -> 201', async () => {
    const res = await request(app)
      .post('/api/coffee-shops')
      .set('Authorization', `Bearer ${owner1Token}`)
      .send({
        name: 'Koordinat Valid',
        description: 'Deskripsi cukup panjang',
        address: 'Jl. Test',
        district: 'Sumbersari',
        priceRange: 'Rp15rb-30rb',
        openingHours: '08.00-22.00',
        latitude: -8.1721,
        longitude: 113.7008,
      })
    expect(res.status).toBe(201)
    expect(res.body.success).toBe(true)
    expect(res.body.data.latitude).toBeCloseTo(-8.1721, 4)
  })

  it('e6. update menolak koordinat di luar Jember -> 400', async () => {
    const resLat = await request(app)
      .put(`/api/coffee-shops/${shopId}`)
      .set('Authorization', `Bearer ${owner1Token}`)
      .send({ latitude: -9.9, longitude: 113.7008 })
    expect(resLat.status).toBe(400)

    const resLng = await request(app)
      .put(`/api/coffee-shops/${shopId}`)
      .set('Authorization', `Bearer ${owner1Token}`)
      .send({ latitude: -8.1721, longitude: 120 })
    expect(resLng.status).toBe(400)

    const resOne = await request(app)
      .put(`/api/coffee-shops/${shopId}`)
      .set('Authorization', `Bearer ${owner1Token}`)
      .send({ latitude: -8.1721 })
    expect(resOne.status).toBe(400)
  })

  it('e7. update tidak mengubah ownerId dan isVerified', async () => {
    const res = await request(app)
      .put(`/api/coffee-shops/${shopId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'CLOSED', ownerId: 'cuid-palsu', isVerified: true })
    expect(res.status).toBe(200)
    expect(res.body.data.ownerId).toBe(owner1Id)
    expect(res.body.data.isVerified).toBe(false)
  })

  it('f. admin kelola menu kedai milik owner lain (create/update/delete), owner lain -> 403', async () => {
    const create = await request(app)
      .post(`/api/coffee-shops/${shopId}/menus`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Menu Admin', price: 22000, category: 'Non-Coffee' })
    expect(create.status).toBe(201)
    const menuId = create.body.data.id

    const update = await request(app)
      .put(`/api/coffee-shops/${shopId}/menus/${menuId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ price: 25000 })
    expect(update.status).toBe(200)
    expect(update.body.data.price).toBe(25000)

    const foreign = await request(app)
      .post(`/api/coffee-shops/${shopId}/menus`)
      .set('Authorization', `Bearer ${owner2Token}`)
      .send({ name: 'Menu Owner Lain', price: 10000 })
    expect(foreign.status).toBe(403)

    const remove = await request(app)
      .delete(`/api/coffee-shops/${shopId}/menus/${menuId}`)
      .set('Authorization', `Bearer ${adminToken}`)
    expect(remove.status).toBe(204)
  })
})