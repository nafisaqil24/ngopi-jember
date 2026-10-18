import { describe, it, expect } from 'vitest'
import { searchShops, getShopBySlugOrName } from './search.service.js'
import { buildReplyMessage } from './templates.js'

describe('Search Service', () => {
  it('returns verified shops and metadata without exposing internal sensitive fields', async () => {
    const result = await searchShops({})
    expect(result).toHaveProperty('shops')
    expect(result).toHaveProperty('metadata')
    expect(typeof result.metadata.totalKedaiTerverifikasi).toBe('number')

    if (result.shops.length > 0) {
      const shop = result.shops[0] as any
      expect(shop).toHaveProperty('slug')
      expect(shop).toHaveProperty('name')
      expect(shop).toHaveProperty('district')
      expect(shop).not.toHaveProperty('ownerId')
      expect(shop).not.toHaveProperty('subscription')
      expect(shop).not.toHaveProperty('id')
      expect(shop.description.length).toBeLessThanOrEqual(163) // 160 + '...'
    }
  })

  it('can search shop by name or slug', async () => {
    const result = await searchShops({})
    if (result.shops.length > 0) {
      const first = result.shops[0]
      const found = await getShopBySlugOrName(first.slug)
      expect(found).not.toBeNull()
      expect(found?.slug).toBe(first.slug)
      expect(found).not.toHaveProperty('ownerId')
    }
  })

  it('triggers fallback when initial search with facility returns 0 results', async () => {
    const result = await searchShops({ district: 'Sumbersari', facilitySlugs: ['non-existent-facility-xyz'] })
    expect(result.metadata.fallbackUsed).toBe('facility_relaxed')
    expect(result.shops.length).toBeGreaterThan(0)
    for (const shop of result.shops) {
      expect(shop).not.toHaveProperty('ownerId')
      expect(shop).not.toHaveProperty('subscription')
      expect(shop).not.toHaveProperty('email')
    }
  })

  it('triggers fallback stage b (price relaxed) when facility + price return 0 results', async () => {
    const result = await searchShops({ district: 'Sumbersari', facilitySlugs: ['non-existent-facility'], maxPrice: 100 })
    expect(result.metadata.fallbackUsed).toBeDefined()
    expect(result.shops.length).toBeGreaterThan(0)
  })

  it('returns empty shops when no district or shop matches at all', async () => {
    const result = await searchShops({ district: 'KecamatanTidakAda123' })
    expect(result.shops.length).toBe(0)
    expect(result.metadata.totalKedaiTerverifikasi).toBe(0)
  })

  it('builds honest reply messages for fallbacks and no results without internal jargon', () => {
    const resNoResults = buildReplyMessage('search_shops', { shops: [], metadata: { totalKedaiTerverifikasi: 0, jumlahTanpaDataHarga: 0, jumlahTanpaJamBuka: 0, jumlahTanpaFasilitas: 0 } })
    expect(resNoResults.reply).toContain('tidak ditemukan kedai kopi')

    const resFallbackA = buildReplyMessage('search_shops', {
      shops: [{
        slug: 'test',
        name: 'Test',
        district: 'Sumbersari',
        address: 'Jl Test',
        priceRange: 'Rp10000',
        openingHours: '09:00',
        latitude: null,
        longitude: null,
        description: 'Desc',
        categories: [],
        facilities: [],
        rating: 5,
        reviewCount: 1,
        image: null,
        openStatus: 'buka'
      }],
      metadata: {
        totalKedaiTerverifikasi: 5,
        jumlahTanpaDataHarga: 0,
        jumlahTanpaJamBuka: 0,
        jumlahTanpaFasilitas: 0,
        fallbackUsed: 'facility_relaxed'
      }
    })
    expect(resFallbackA.reply).toContain('Belum ada kedai dengan fasilitas tersebut')
    expect(resFallbackA.reply).not.toContain('data terstruktur')
    expect(resFallbackA.reply).not.toContain('terverifikasi')
  })
})
