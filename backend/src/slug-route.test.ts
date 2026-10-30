import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import { app } from './app.js'
import { prisma } from './lib/prisma.js'
import { hashPassword } from './utils/password.js'
import { deleteTestUser } from './test/helpers.js'

// Test mandiri (self-cleaning) untuk perilaku slug pada route detail kedai.
// Data uji dibuat langsung lewat Prisma agar bisa menyisipkan slug lama yang
// mengandung tanda hubung beruntun (seperti data nyata di DB utama).
describe('Slug coffee shop route', () => {
  const runId = `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
  const slugSafeId = runId.replace(/_/g, '-')
  const directOwnerEmail = `owner_slug_direct_${runId}@ngopijember.test`
  const endpointOwnerEmail = `owner_slug_endpoint_${runId}@ngopijember.test`
  let directShopId = ''
  let endpointOwnerToken = ''
  let createdShopId = ''

  beforeAll(async () => {
    const owner = await prisma.user.create({
      data: {
        name: 'Slug Direct Owner',
        email: directOwnerEmail,
        password: await hashPassword('Password123!'),
        role: 'OWNER',
      },
    })

    const shop = await prisma.coffeeShop.create({
      data: {
        ownerId: owner.id,
        name: 'Uji Slug Beruntun',
        slug: 'uji-slug---beruntun',
        description: 'Kedai uji dengan slug mengandung tanda hubung beruntun',
        address: 'Jl. Uji Slug No. 1',
        district: 'Sumbersari',
        priceRange: 'Rp15rb-30rb',
        openingHours: '08.00-22.00',
        isVerified: true,
      },
    })
    directShopId = shop.id

    const reg = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Slug Endpoint Owner', email: endpointOwnerEmail, password: 'Password123!', role: 'OWNER' })
    expect(reg.status).toBe(201)
    endpointOwnerToken = reg.body.data.token
  }, 25000)

  afterAll(async () => {
    try {
      if (createdShopId) await prisma.coffeeShop.deleteMany({ where: { id: createdShopId } })
      if (directShopId) await prisma.coffeeShop.deleteMany({ where: { id: directShopId } })
      await deleteTestUser(directOwnerEmail)
      await deleteTestUser(endpointOwnerEmail)
    } catch (err) {
      console.error('Slug route test cleanup error:', err)
    }
  })

  it('membuka slug lama yang mengandung tanda hubung beruntun -> 200', async () => {
    const res = await request(app).get('/api/coffee-shops/uji-slug---beruntun')
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data.slug).toBe('uji-slug---beruntun')
  })

  it('menolak slug dengan karakter tidak valid -> 400', async () => {
    const res = await request(app).get('/api/coffee-shops/ABC_def!')
    expect(res.status).toBe(400)
    expect(res.body.success).toBe(false)
  })

  it('mengembalikan 404 untuk slug valid yang tidak ada di database', async () => {
    const res = await request(app).get(`/api/coffee-shops/slug-valid-tidak-ada-${slugSafeId}`)
    expect(res.status).toBe(404)
    expect(res.body.success).toBe(false)
  })

  it('membuat kedai dengan nama berpola strip & simbol menghasilkan slug tanpa "--"', async () => {
    const res = await request(app)
      .post('/api/coffee-shops')
      .set('Authorization', `Bearer ${endpointOwnerToken}`)
      .send({
        name: 'Uji Strip - Dan & Simbol',
        description: 'Deskripsi cukup panjang untuk uji slug',
        address: 'Jl. Uji Strip No. 2',
        district: 'Sumbersari',
        priceRange: 'Rp15rb-30rb',
        openingHours: '08.00-22.00',
      })
    expect(res.status).toBe(201)
    createdShopId = res.body.data.id
    expect(res.body.data.slug).not.toContain('--')
    expect(res.body.data.slug).toBe('uji-strip-dan-simbol')
  })
})
