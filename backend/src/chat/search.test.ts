import { describe, it, expect } from 'vitest'
import { searchShops, getShopBySlugOrName } from './search.service.js'

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
})
