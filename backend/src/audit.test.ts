import { describe, it, expect } from 'vitest'
import request from 'supertest'
import { app } from './app.js'

describe('Comprehensive Security & API Audit', () => {
  let userToken = ''
  let ownerToken = ''
  let adminToken = ''
  let shopId = ''

  it('1. Authentication & Role Authorization (401 & 403 checks)', async () => {
    // A. Access admin endpoint without token -> 401
    const resNoToken = await request(app).get('/api/admin/coffee-shops')
    expect(resNoToken.status).toBe(401)
    expect(resNoToken.body.success).toBe(false)

    // Register normal user
    const userReg = await request(app)
      .post('/api/auth/register')
      .send({ name: 'User Audit', email: `user_audit_${Date.now()}@test.com`, password: 'Password123!', role: 'USER' })
    expect(userReg.status).toBe(201)
    userToken = userReg.body.data.token

    // B. Access admin endpoint with USER role -> 403
    const resUserAdmin = await request(app)
      .get('/api/admin/coffee-shops')
      .set('Authorization', `Bearer ${userToken}`)
    expect(resUserAdmin.status).toBe(403)
    expect(resUserAdmin.body.success).toBe(false)

    // C. Access owner endpoint with USER role -> 403
    const resUserOwner = await request(app)
      .get('/api/owner/coffee-shop')
      .set('Authorization', `Bearer ${userToken}`)
    expect(resUserOwner.status).toBe(403)
    expect(resUserOwner.body.success).toBe(false)
  })

  it('2. End-to-End Workflow (User & Owner & Admin)', async () => {
    // A. User browse coffee shops
    const browseRes = await request(app).get('/api/coffee-shops')
    expect(browseRes.status).toBe(200)
    expect(browseRes.body.success).toBe(true)

    // B. Register Owner
    const ownerReg = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Owner Audit', email: `owner_audit_${Date.now()}@test.com`, password: 'Password123!', role: 'OWNER' })
    expect(ownerReg.status).toBe(201)
    ownerToken = ownerReg.body.data.token

    // C. Owner creates shop
    const createShopRes = await request(app)
      .post('/api/coffee-shops')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        name: 'Audit Coffee Shop',
        description: 'Testing end to end audit workflow',
        address: 'Jl. Audit No. 10',
        district: 'Sumbersari',
        priceRange: 'Rp15rb-30rb',
        openingHours: '08.00-22.00',
        latitude: -8.1721,
        longitude: 113.7008,
      })
    expect(createShopRes.status).toBe(201)
    shopId = createShopRes.body.data.id
    expect(createShopRes.body.data.isVerified).toBe(false)

    // D. Login as Admin and Verify Shop & Set Featured
    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@ngopijember.test', password: 'Admin123!' })
    expect(adminLogin.status).toBe(200)
    adminToken = adminLogin.body.data.token

    const verifyRes = await request(app)
      .patch(`/api/admin/coffee-shops/${shopId}/verify`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ isVerified: true })
    expect(verifyRes.status).toBe(200)
    expect(verifyRes.body.data.isVerified).toBe(true)

    const featureRes = await request(app)
      .patch(`/api/admin/coffee-shops/${shopId}/featured`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ isFeatured: true })
    expect(featureRes.status).toBe(200)
    expect(featureRes.body.data.isFeatured).toBe(true)
  })

  it('3. Production Error Handling (NODE_ENV=production test)', async () => {
    const originalEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'production'

    const res = await request(app).get('/api/nonexistent')
    expect(res.status).toBe(404)
    expect(res.body.success).toBe(false)

    process.env.NODE_ENV = originalEnv
  })
})
