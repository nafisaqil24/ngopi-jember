import { describe, it, expect } from 'vitest'
import { slugify } from './slug.js'

describe('slugify', () => {
  it('mengganti rangkaian spasi dan tanda hubung dengan satu tanda hubung', () => {
    expect(slugify('Sumber Redjo - Coffee & Eatery')).toBe('sumber-redjo-coffee-eatery')
  })

  it('membuang simbol dan merapatkan spasi', () => {
    expect(slugify('Kopi & Teh')).toBe('kopi-teh')
  })

  it('memangkas spasi di awal dan akhir', () => {
    expect(slugify('  Margin   Cafe  ')).toBe('margin-cafe')
  })

  it('membuang tanda hubung di awal dan akhir', () => {
    expect(slugify('- Kopi -')).toBe('kopi')
  })

  it('merapatkan tanda hubung beruntun menjadi satu', () => {
    expect(slugify('Kopi -- Teh')).toBe('kopi-teh')
  })

  it('mempertahankan perilaku lama: apostrof dibuang', () => {
    expect(slugify("D'Kopi")).toBe('dkopi')
  })

  it('mengembalikan "kedai" bila nama hanya simbol', () => {
    expect(slugify('!!!')).toBe('kedai')
  })
})
