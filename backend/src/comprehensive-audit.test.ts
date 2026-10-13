import { describe, it, expect } from 'vitest'
import request from 'supertest'
import { app } from './app.js'

describe('Comprehensive End-to-End System Audit', () => {
  let userToken = ''
  let ownerToken = ''
  let adminToken = ''
  let shopId = ''

  it('1. Environment & Database check', () => {
    const dbUrl = process.env.DATABASE_URL ?? ''
    console.log('AUDIT DATABASE_URL:', dbUrl)
    expect(dbUrl).toBeDefined()
  })

  it('2. User Role Flow (Register, Login, Browse)', async () => {
    const email = `audit_user_${Date.now()}@test.com`
    const regRes = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Audit User', email, password: 'Password123!', role: 'USER' })
    expect(regRes.status).toBe(201)
    userToken = regRes.body.data.token
    console.log('USER REGISTER RESPONSE:', JSON.stringify(regRes.body, null, 2))

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email, password: 'Password123!' })
    expect(loginRes.status).toBe(200)

    const browseRes = await request(app).get('/api/coffee-shops')
    expect(browseRes.status).toBe(200)
    console.log('USER BROWSE RESPONSE:', JSON.stringify(browseRes.body, null, 2))
  })

  it('3. Owner Role Flow (Register, Create Shop with Image, Add Menu)', async () => {
    const email = `audit_owner_${Date.now()}@test.com`
    const regRes = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Audit Owner', email, password: 'Password123!', role: 'OWNER' })
    expect(regRes.status).toBe(201)
    ownerToken = regRes.body.data.token

    const dummyBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64')

    const shopRes = await request(app)
      .post('/api/coffee-shops')
      .set('Authorization', `Bearer ${ownerToken}`)
      .field('name', 'Audit Comprehensive Cafe')
      .field('description', 'Testing comprehensive audit flow')
      .field('address', 'Jl. Comprehensive No. 1')
      .field('district', 'Sumbersari')
      .field('priceRange', 'Rp15rb-30rb')
      .field('openingHours', '09.00-22.00')
      .field('latitude', -8.1721)
      .field('longitude', 113.7008)
      .attach('image', dummyBuffer, { filename: 'test.png', contentType: 'image/png' })

    expect(shopRes.status).toBe(201)
    shopId = shopRes.body.data.id
    console.log('OWNER CREATE SHOP RESPONSE:', JSON.stringify(shopRes.body, null, 2))

    const menuRes = await request(app)
      .post(`/api/coffee-shops/${shopId}/menus`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Espresso Audit', price: 20000, category: 'Coffee' })
    expect(menuRes.status).toBe(201)
    console.log('OWNER ADD MENU RESPONSE:', JSON.stringify(menuRes.body, null, 2))
  })

  it('4. Admin Role Flow (Login Admin, Get Shops, Verify Shop, Auth 403 check)', async () => {
    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@ngopijember.test', password: 'Admin123!' })
    expect(adminLogin.status).toBe(200)
    adminToken = adminLogin.body.data.token

    const adminShopsRes = await request(app)
      .get('/api/admin/coffee-shops')
      .set('Authorization', `Bearer ${adminToken}`)
    expect(adminShopsRes.status).toBe(200)
    console.log('ADMIN GET SHOPS RESPONSE:', JSON.stringify(adminShopsRes.body, null, 2))

    const verifyRes = await request(app)
      .patch(`/api/admin/coffee-shops/${shopId}/verify`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ isVerified: true })
    expect(verifyRes.status).toBe(200)
    console.log('ADMIN VERIFY SHOP RESPONSE:', JSON.stringify(verifyRes.body, null, 2))

    // Check unauthorized access (USER accessing admin endpoint)
    const forbiddenRes = await request(app)
      .get('/api/admin/coffee-shops')
      .set('Authorization', `Bearer ${userToken}`)
    expect(forbiddenRes.status).toBe(403)
    console.log('FORBIDDEN ACCESS RESPONSE:', JSON.stringify(forbiddenRes.body, null, 2))
  })

  it('5. Rate Limiter Test (11 requests to login with wrong password)', async () => {
    let lastStatus = 200
    let lastBody: any = {}

    for (let i = 1; i <= 11; i++) {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'wrong@test.com', password: 'wrongpassword' })
      lastStatus = res.status
      lastBody = res.body
    }

    console.log('RATE LIMIT TEST (Request 11 Status):', lastStatus)
    console.log('RATE LIMIT TEST (Request 11 Body):', JSON.stringify(lastBody, null, 2))

    expect(lastStatus).toBe(429)
    expect(lastBody.message).toBe('Terlalu banyak percobaan, coba lagi nanti')
  })
})
