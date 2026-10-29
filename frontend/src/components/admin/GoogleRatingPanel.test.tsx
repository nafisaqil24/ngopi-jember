import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import GoogleRatingPanel from './GoogleRatingPanel'
import { formatGoogleRatingLabel } from '../../utils/rating'

describe('GoogleRatingPanel', () => {
  it('menampilkan 3 input rating Google dengan batas yang benar', () => {
    render(
      <GoogleRatingPanel
        initialRating={4.5}
        initialReviewCount={150}
        initialRatingAt="2026-10-22T00:00:00.000Z"
        onSave={vi.fn()}
        onDelete={vi.fn()}
      />
    )

    const ratingInput = screen.getByLabelText('Rating Google (0-5)') as HTMLInputElement
    expect(ratingInput.type).toBe('number')
    expect(ratingInput.min).toBe('0')
    expect(ratingInput.max).toBe('5')
    expect(ratingInput.step).toBe('0.1')

    expect(screen.getByLabelText('Jumlah ulasan Google')).toBeInTheDocument()
    expect(screen.getByLabelText('Tanggal ambil rating')).toBeInTheDocument()
  })

  it('memanggil onSave dengan angka yang sudah diparse', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    render(
      <GoogleRatingPanel
        initialRating={null}
        initialReviewCount={null}
        initialRatingAt={null}
        onSave={onSave}
        onDelete={vi.fn()}
      />
    )

    fireEvent.change(screen.getByLabelText('Rating Google (0-5)'), { target: { value: '4.7' } })
    fireEvent.change(screen.getByLabelText('Jumlah ulasan Google'), { target: { value: '120' } })
    fireEvent.click(screen.getByRole('button', { name: /Simpan rating Google/i }))

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith({
        googleRating: 4.7,
        googleReviewCount: 120,
        googleRatingAt: null,
      })
    })
  })

  it('menampilkan tombol Hapus rating Google hanya bila rating sudah ada dan memanggil onDelete', async () => {
    const onDelete = vi.fn().mockResolvedValue(undefined)
    render(
      <GoogleRatingPanel
        initialRating={4.2}
        initialReviewCount={10}
        initialRatingAt={null}
        onSave={vi.fn()}
        onDelete={onDelete}
      />
    )

    const deleteButton = screen.getByRole('button', { name: /Hapus rating Google/i })
    fireEvent.click(deleteButton)

    await waitFor(() => {
      expect(onDelete).toHaveBeenCalled()
    })
  })

  it('tidak menampilkan tombol Hapus bila belum ada rating Google', () => {
    render(
      <GoogleRatingPanel
        initialRating={null}
        initialReviewCount={null}
        initialRatingAt={null}
        onSave={vi.fn()}
        onDelete={vi.fn()}
      />
    )

    expect(screen.queryByRole('button', { name: /Hapus rating Google/i })).not.toBeInTheDocument()
  })
})

describe('formatGoogleRatingLabel', () => {
  it('menyusun label sumber rating Google dengan tanggal dan jumlah ulasan', () => {
    const label = formatGoogleRatingLabel(150, '2026-10-22T00:00:00.000Z')
    expect(label).toContain('Rating Google Maps, per')
    expect(label).toContain('(150 ulasan)')
  })

  it('mengembalikan null bila tanggal tidak ada', () => {
    expect(formatGoogleRatingLabel(150, null)).toBeNull()
  })

  it('menyebut sumber Google Maps meski jumlah ulasan tidak tersedia', () => {
    const label = formatGoogleRatingLabel(null, '2026-10-22T00:00:00.000Z')
    expect(label).toContain('Rating Google Maps, per')
  })
})