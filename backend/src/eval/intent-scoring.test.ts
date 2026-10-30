import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'
import { normalizeName, scorePrediction, validateIntentDataset } from './intent-scoring.js'

describe('normalizeName', () => {
  it('menyamakan nama dengan dan tanpa spasi/simbol', () => {
    expect(normalizeName('Margin Cafe')).toBe('margincafe')
    expect(normalizeName('MarginCafe')).toBe('margincafe')
    expect(normalizeName('888 Coffee & More')).toBe('888coffeemore')
  })
})

describe('scorePrediction', () => {
  it('subset fasilitas: actual boleh punya fasilitas tambahan', () => {
    const result = scorePrediction(
      { intent: 'search_shops', facilitySlugsInclude: ['wifi'] },
      { intent: 'search_shops', filters: { facilitySlugs: ['wifi', 'ac'] } }
    )
    expect(result.intentCorrect).toBe(true)
    expect(result.fullCorrect).toBe(true)
  })

  it('subset fasilitas gagal bila ada yang hilang', () => {
    const result = scorePrediction(
      { intent: 'search_shops', facilitySlugsInclude: ['wifi', 'parkir-mobil'] },
      { intent: 'search_shops', filters: { facilitySlugs: ['wifi'] } }
    )
    expect(result.fullCorrect).toBe(false)
    expect(result.failures.join(' ')).toContain('parkir-mobil')
  })

  it('membandingkan shopQuery setelah dinormalisasi', () => {
    const result = scorePrediction(
      { intent: 'shop_detail', shopQueryContains: 'Margin Cafe' },
      { intent: 'shop_detail', shopQuery: 'MarginCafe' }
    )
    expect(result.fullCorrect).toBe(true)
  })

  it('membandingkan prioritas per level', () => {
    const ok = scorePrediction(
      { intent: 'search_shops', priorities: { price: 'tinggi' } },
      { intent: 'search_shops', priorities: { price: 'tinggi', distance: 'normal' } }
    )
    expect(ok.fullCorrect).toBe(true)

    const wrong = scorePrediction(
      { intent: 'search_shops', priorities: { price: 'tinggi' } },
      { intent: 'search_shops', priorities: { price: 'rendah' } }
    )
    expect(wrong.fullCorrect).toBe(false)
    expect(wrong.failures.join(' ')).toContain('priorities.price')
  })

  it('mendukung harapan intent berupa daftar (mis. injeksi prompt)', () => {
    const result = scorePrediction(
      { intent: ['out_of_scope', 'smalltalk'] },
      { intent: 'smalltalk' }
    )
    expect(result.intentCorrect).toBe(true)
    expect(result.fullCorrect).toBe(true)
  })

  it('gagal bila intent tidak cocok', () => {
    const result = scorePrediction({ intent: 'faq' }, { intent: 'smalltalk' })
    expect(result.intentCorrect).toBe(false)
    expect(result.fullCorrect).toBe(false)
  })
})

describe('validateIntentDataset', () => {
  const datasetPath = path.resolve(process.cwd(), 'src/eval/intent-dataset.json')
  const dataset = JSON.parse(fs.readFileSync(datasetPath, 'utf-8'))

  it('dataset asli valid, id unik, intent & faqTopic valid', () => {
    const result = validateIntentDataset(dataset)
    expect(result.errors).toEqual([])
    expect(result.ok).toBe(true)
    expect(result.total).toBeGreaterThanOrEqual(40)
    expect(result.total).toBeLessThanOrEqual(60)
    expect(result.countsByCategory.search_shops).toBeGreaterThanOrEqual(10)
    expect(result.countsByCategory.shop_detail).toBeGreaterThanOrEqual(10)
    expect(result.countsByCategory.nearby).toBeGreaterThanOrEqual(6)
    expect(result.countsByCategory.faq).toBeGreaterThanOrEqual(7)
    expect(result.countsByCategory.smalltalk).toBeGreaterThanOrEqual(3)
    expect(result.countsByCategory.out_of_scope).toBeGreaterThanOrEqual(4)
    expect(result.countsByCategory.prompt_injection).toBeGreaterThanOrEqual(4)
  })

  it('menolak id duplikat', () => {
    const result = validateIntentDataset([
      { id: 'a', category: 'faq', text: 'x', expect: { intent: 'faq' } },
      { id: 'a', category: 'faq', text: 'y', expect: { intent: 'faq' } },
    ])
    expect(result.ok).toBe(false)
    expect(result.errors.join(' ')).toContain('duplikat')
  })

  it('menolak intent tidak valid', () => {
    const result = validateIntentDataset([
      { id: 'a', category: 'faq', text: 'x', expect: { intent: 'intent_ngawur' } },
    ])
    expect(result.ok).toBe(false)
    expect(result.errors.join(' ')).toContain('intent tidak valid')
  })

  it('menolak faqTopic tidak valid', () => {
    const result = validateIntentDataset([
      { id: 'a', category: 'faq', text: 'x', expect: { intent: 'faq', faqTopic: 'topik_ngawur' } },
    ])
    expect(result.ok).toBe(false)
    expect(result.errors.join(' ')).toContain('faqTopic tidak valid')
  })
})