import { describe, it, expect } from 'vitest'
import { formatRating } from './rating'

describe('formatRating', () => {
  it('mengembalikan teks netral bila rating null', () => {
    expect(formatRating(null, 0)).toBe('Belum ada rating')
  })

  it('mengembalikan teks netral bila rating 0 dan belum ada ulasan', () => {
    expect(formatRating(0, 0)).toBe('Belum ada rating')
  })

  it('menampilkan satu desimal untuk rating valid', () => {
    expect(formatRating(4.76, 12)).toBe('4.8')
  })

  it('tetap menampilkan rating 0 bila berasal dari Google', () => {
    expect(formatRating(0, 0, 'google')).toBe('0.0')
  })

  it('menampilkan rating Google yang valid', () => {
    expect(formatRating(4.7, 200, 'google')).toBe('4.7')
  })
})