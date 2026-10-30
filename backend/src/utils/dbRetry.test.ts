import { describe, it, expect, vi } from 'vitest'
import { withDbRetry, isTransientDbError, DB_RETRY_DELAY_MS } from './dbRetry.js'

function prismaError(code: string, message = 'boom') {
  return Object.assign(new Error(message), { code })
}

describe('isTransientDbError', () => {
  it.each(['P1001', 'P1002', 'P1008', 'P1017'])('menganggap kode %s transien', (code) => {
    expect(isTransientDbError(prismaError(code))).toBe(true)
  })

  it('menganggap pesan "Server has closed the connection" transien', () => {
    expect(isTransientDbError(new Error('Server has closed the connection'))).toBe(true)
  })

  it('menganggap error non-transien tidak transien', () => {
    expect(isTransientDbError(prismaError('P2002'))).toBe(false)
    expect(isTransientDbError(new Error('data tidak ditemukan'))).toBe(false)
    expect(isTransientDbError(null)).toBe(false)
  })
})

describe('withDbRetry', () => {
  it('mengulang sekali saat P1017 lalu sukses (query dipanggil dua kali)', async () => {
    const operation = vi.fn().mockRejectedValueOnce(prismaError('P1017')).mockResolvedValueOnce('ok')

    const result = await withDbRetry(operation, 0)

    expect(result).toBe('ok')
    expect(operation).toHaveBeenCalledTimes(2)
  })

  it('jika transien di kedua percobaan, error dilempar dan tidak diulang lagi', async () => {
    const operation = vi.fn().mockRejectedValue(prismaError('P1017'))

    await expect(withDbRetry(operation, 0)).rejects.toThrow('boom')
    expect(operation).toHaveBeenCalledTimes(2)
  })

  it('error non-transien tidak diulang sama sekali', async () => {
    const operation = vi.fn().mockRejectedValue(prismaError('P2002'))

    await expect(withDbRetry(operation, 0)).rejects.toBeInstanceOf(Error)
    expect(operation).toHaveBeenCalledTimes(1)
  })

  it('memakai jeda default sekitar 300 ms', () => {
    expect(DB_RETRY_DELAY_MS).toBe(300)
  })
})