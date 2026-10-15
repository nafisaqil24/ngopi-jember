import { describe, it, expect } from 'vitest'
import request from 'supertest'
import { app } from './app.js'

describe('SPA fallback (frontend/dist)', () => {
  it('GET /coffee-shops/abc mengembalikan HTML (fallback SPA)', async () => {
    const res = await request(app).get('/coffee-shops/abc')
    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toMatch(/text\/html/)
    expect(res.text).toContain('<!doctype html>')
  })

  it('GET /api/tidak-ada mengembalikan 404 JSON', async () => {
    const res = await request(app).get('/api/tidak-ada')
    expect(res.status).toBe(404)
    expect(res.headers['content-type']).toMatch(/application\/json/)
    expect(res.body).toEqual({
      success: false,
      message: 'Endpoint tidak ditemukan',
    })
  })

  it('GET /assets/tidak-ada.js mengembalikan 404, bukan index.html', async () => {
    const res = await request(app).get('/assets/tidak-ada.js')
    expect(res.status).toBe(404)
    expect(res.headers['content-type']).not.toMatch(/text\/html/)
  })
})