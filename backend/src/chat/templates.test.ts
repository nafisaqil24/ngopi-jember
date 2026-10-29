import { describe, it, expect } from 'vitest'
import { buildReplyMessage } from './templates.js'
import { getFaqAnswer } from './faq.js'

describe('FAQ reply rendering (faqTopic kosong/undefined/valid)', () => {
  it('memakai jawaban FAQ default saat faqTopic undefined', () => {
    const res = buildReplyMessage('faq')
    expect(res.reply).toContain('Ngopi Jember')
    expect(res.reply).not.toContain('Halo!')
  })

  it('memakai jawaban FAQ default saat faqTopic string kosong', () => {
    const res = buildReplyMessage('faq', undefined, undefined, '')
    expect(res.reply).toContain('Ngopi Jember')
    expect(res.reply).toContain('cara daftar')
  })

  it('memakai jawaban FAQ default saat faqTopic hanya spasi', () => {
    const res = buildReplyMessage('faq', undefined, undefined, '   ')
    expect(res.reply).toContain('Ngopi Jember')
  })

  it('memakai jawaban FAQ spesifik saat faqTopic valid', () => {
    const res = buildReplyMessage('faq', undefined, undefined, 'cara_daftar')
    expect(res.reply).toBe(getFaqAnswer('cara_daftar'))
    expect(res.reply).toContain('Register')
    expect(res.reply).not.toContain('saya belum memiliki informasi detail')
  })
})
