import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import { app } from './app.js'
import { createTestAdmin, deleteTestUser } from './test/helpers.js'
import { searchShops } from './chat/search.service.js'

describe('Google Rating Feature (Admin & Effective Rating & SAW)', () => {
  let adminCredentials: { email: string; password: string } | null = null
  let adminToken = ''
  let ownerToken = ''
  let ownerEmail = ''
  let userToken = ''
  let userEmail = ''
  let shopId = ''
  let shopSlug = ''
  const createdEmails: string[] = []

  beforeAll(async () => {
    adminCredentials = await createTestAdmin()
    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: adminCredentials!.email, password: adminCredentials!.password })
    adminToken = adminLogin.body.data.token

    ownerEmail = `owner_g_rating_${Date.now()}@ngopijember.test`
    userEmail = `user_g_rating_${Date.now()}@ngopijember.test`
    createdEmails.push(ownerEmail, userEmail)

    const regOwner = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Rating Owner', email: ownerEmail, password: 'Password123!', role: 'OWNER' })
    ownerToken = regOwner.body.data.token

    const regUser = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Rating User', email: userEmail, password: 'Password123!', role: 'USER' })
    userToken = regUser.body.data.token

    // Create coffee shop as owner (trying to inject googleRating should be ignored/rejected)
    const createShop = await request(app)
      .post('/api/coffee-shops')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        name: 'Google Rating Cafe',
        description: 'Cafe untuk uji rating google',
        address: 'Jl. Mastrip',
        district: 'Sumbersari',
        priceRange: 'Rp15rb-30rb',
        openingHours: '08.00-22.00',
        googleRating: 4.8, // Should be ignored by owner endpoint
      })
    expect(createShop.status).toBe(201)
    shopId = createShop.body.data.id
    shopSlug = createShop.body.data.slug
    expect(createShop.body.data.googleRating).toBeFalsy() // owner tidak bisa menyetel

    // Verifikasi kedai agar bisa muncul di pencarian publik (untuk uji SAW).
    const verify = await request(app)
      .patch(`/api/admin/coffee-shops/${shopId}/verify`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ isVerified: true })
    expect(verify.status).toBe(200)
  }, 25000)

  afterAll(async () => {
    try {
      for (const email of createdEmails) {
        await deleteTestUser(email)
      }
      if (adminCredentials) {
        await deleteTestUser(adminCredentials.email)
      }
    } catch (e) {
      console.error(e)
    }
  })

  it('1. Owner tidak bisa menyetel field googleRating lewat endpoint coffee-shops', async () => {
    const updateRes = await request(app)
      .put(`/api/coffee-shops/${shopId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ googleRating: 4.9 })
    expect(updateRes.status).toBe(200)
    
    // Check detail
    const detailRes = await request(app).get(`/api/coffee-shops/${shopSlug}`)
    expect(detailRes.status).toBe(200)
    expect(detailRes.body.data.googleRating).toBeFalsy()
  })

  it('2. Admin PATCH google-rating menolak validasi gagal (rating 5.1, -1, string)', async () => {
    const res1 = await request(app)
      .patch(`/api/admin/coffee-shops/${shopId}/google-rating`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ googleRating: 5.1 })
    expect(res1.status).toBe(400)

    const res2 = await request(app)
      .patch(`/api/admin/coffee-shops/${shopId}/google-rating`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ googleRating: -0.5 })
    expect(res2.status).toBe(400)

    const res3 = await request(app)
      .patch(`/api/admin/coffee-shops/${shopId}/google-rating`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ googleRating: 'empat' })
    expect(res3.status).toBe(400)
  })

  it('3. Otentikasi & Otorisasi: Owner, User, dan Tanpa login ditolak mengakses PATCH admin google-rating', async () => {
    const resOwner = await request(app)
      .patch(`/api/admin/coffee-shops/${shopId}/google-rating`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ googleRating: 4.5 })
    expect(resOwner.status).toBe(403)

    const resUser = await request(app)
      .patch(`/api/admin/coffee-shops/${shopId}/google-rating`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ googleRating: 4.5 })
    expect(resUser.status).toBe(403)

    const resAnon = await request(app)
      .patch(`/api/admin/coffee-shops/${shopId}/google-rating`)
      .send({ googleRating: 4.5 })
    expect(resAnon.status).toBe(401)
  })

  it('4. Admin berhasil set googleRating, reviewCount, ratingAt dan menghapusnya dengan null', async () => {
    const patchRes = await request(app)
      .patch(`/api/admin/coffee-shops/${shopId}/google-rating`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        googleRating: 4.7,
        googleReviewCount: 200,
        googleRatingAt: '2026-10-22T00:00:00.000Z'
      })
    expect(patchRes.status).toBe(200)
    expect(patchRes.body.success).toBe(true)
    expect(patchRes.body.data.googleRating).toBe(4.7)
    expect(patchRes.body.data.googleReviewCount).toBe(200)
    expect(patchRes.body.data.ratingSource).toBe('google')

    // Public detail check
    const publicRes = await request(app).get(`/api/coffee-shops/${shopSlug}`)
    expect(publicRes.status).toBe(200)
    expect(publicRes.body.data.rating).toBe(4.7)
    expect(publicRes.body.data.ratingSource).toBe('google')
    expect(publicRes.body.data.googleReviewCount).toBe(200)

    // Delete google rating with null
    const deleteRes = await request(app)
      .patch(`/api/admin/coffee-shops/${shopId}/google-rating`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ googleRating: null })
    expect(deleteRes.status).toBe(200)
    expect(deleteRes.body.data.googleRating).toBeNull()
    expect(deleteRes.body.data.googleReviewCount).toBeNull()
    expect(deleteRes.body.data.ratingSource).toBeNull()
  })

  it('5. SAW memakai rating efektif: kedai dengan googleRating tanpa Review tetap punya rating pada sawDetails', async () => {
    const patchRes = await request(app)
      .patch(`/api/admin/coffee-shops/${shopId}/google-rating`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ googleRating: 4.6, googleReviewCount: 88 })
    expect(patchRes.status).toBe(200)

    const result = await searchShops({ searchQuery: 'Google Rating Cafe' })
    const shop = result.shops.find((s) => s.slug.startsWith('google-rating-cafe'))
    expect(shop).toBeDefined()
    expect(shop!.rating).toBe(4.6)
    expect(shop!.ratingSource).toBe('google')
    expect(shop!.sawDetails).toBeDefined()
    expect(shop!.sawDetails.rating.raw).toBe(4.6)

    // Bersihkan lagi agar tidak meninggalkan rating google pada data uji.
    await request(app)
      .patch(`/api/admin/coffee-shops/${shopId}/google-rating`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ googleRating: null })
  })
})
