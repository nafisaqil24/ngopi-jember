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
})
