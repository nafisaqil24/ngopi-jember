import { describe, it, expect } from 'vitest'
import request from 'supertest'
import { app } from './app.js'

describe('API Health and Error Handling', () => {
  it('GET /api/health returns success status', async () => {
    const res = await request(app).get('/api/health')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({
      success: true,
      data: { status: 'ok' },
    })
  })

  it('GET /api/nonexistent returns 404 with standard error format', async () => {
    const res = await request(app).get('/api/nonexistent')
    expect(res.status).toBe(404)
    expect(res.body).toEqual({
      success: false,
      message: 'Endpoint API tidak ditemukan',
    })
  })

  it('PUT /api/coffee-shops/:id updates shop status to CLOSED in database', async () => {
    const email = `owner_${Date.now()}@test.com`
    const regRes = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Test Owner', email, password: 'Password123!', role: 'OWNER' })
    
    expect(regRes.status).toBe(201)
    const token = regRes.body.data.token

    const shopRes = await request(app)
      .post('/api/coffee-shops')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Kopi Status Test',
        description: 'Testing status update in database properly',
        address: 'Jl. Test No. 1',
        district: 'Sumbersari',
        priceRange: 'Rp15rb-30rb',
        openingHours: '09.00-22.00',
        latitude: -8.1721,
        longitude: 113.7008,
      })
    
    expect(shopRes.status).toBe(201)
    const shopId = shopRes.body.data.id
    expect(shopRes.body.data.status).toBe('OPEN')

    const updateRes = await request(app)
      .put(`/api/coffee-shops/${shopId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'CLOSED' })
    
    expect(updateRes.status).toBe(200)
    expect(updateRes.body.data.status).toBe('CLOSED')
  })
})
