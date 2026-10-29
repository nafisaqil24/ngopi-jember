import { describe, it, expect } from 'vitest'
import { normalizeWhatsAppNumber } from './phone'

describe('normalizeWhatsAppNumber', () => {
  it('mengubah awalan 0 menjadi 62', () => {
    expect(normalizeWhatsAppNumber('0812-3456-7890')).toBe('6281234567890')
  })

  it('mempertahankan nomor yang sudah memakai awalan +62', () => {
    expect(normalizeWhatsAppNumber('+62 812 3456 7890')).toBe('6281234567890')
  })

  it('mempertahankan nomor yang sudah memakai awalan 62', () => {
    expect(normalizeWhatsAppNumber('62812-3456-7890')).toBe('6281234567890')
  })

  it('menambahkan 62 pada nomor yang dimulai dengan 8', () => {
    expect(normalizeWhatsAppNumber('812 3456 7890')).toBe('6281234567890')
  })

  it('membuang spasi, strip, dan tanda kurung', () => {
    expect(normalizeWhatsAppNumber('(0812) 3456-7890')).toBe('6281234567890')
  })

  it('mengembalikan null untuk string kosong', () => {
    expect(normalizeWhatsAppNumber('')).toBeNull()
  })

  it('mengembalikan null untuk tanda minus saja', () => {
    expect(normalizeWhatsAppNumber('-')).toBeNull()
  })

  it('mengembalikan null untuk teks tanpa digit', () => {
    expect(normalizeWhatsAppNumber('telepon')).toBeNull()
  })

  it('mengembalikan null untuk nomor terlalu pendek', () => {
    expect(normalizeWhatsAppNumber('0812')).toBeNull()
  })

  it('mengembalikan null untuk nomor terlalu panjang', () => {
    expect(normalizeWhatsAppNumber('0812345678901234')).toBeNull()
  })

  it('mengembalikan null untuk awalan yang tidak dikenal', () => {
    expect(normalizeWhatsAppNumber('123456789')).toBeNull()
  })

  it('mengembalikan null untuk input null/undefined', () => {
    expect(normalizeWhatsAppNumber(null)).toBeNull()
    expect(normalizeWhatsAppNumber(undefined)).toBeNull()
  })
})