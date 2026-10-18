import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import ChatShopCard from './ChatShopCard'
import type { ChatShop } from '../../services/chat'

function makeShop(overrides: Partial<ChatShop> = {}): ChatShop {
  return {
    slug: 'kopi-abc',
    name: 'Kopi ABC',
    district: 'Sumbersari',
    address: 'Jl. Test',
    priceRange: 'Rp10.000 - Rp20.000',
    openingHours: '08:00 - 22:00',
    latitude: null,
    longitude: null,
    description: 'Enak',
    categories: [],
    facilities: [],
    rating: 4.5,
    reviewCount: 10,
    image: null,
    ...overrides,
  }
}

function renderCard(shop: ChatShop) {
  return render(
    <MemoryRouter>
      <ChatShopCard shop={shop} />
    </MemoryRouter>
  )
}

describe('ChatShopCard', () => {
  it("status 'tidak_diketahui' tampil netral dan tidak menulis Tutup", () => {
    renderCard(makeShop({ openStatus: 'tidak_diketahui' }))
    expect(screen.getByText('Jam buka belum pasti')).toBeInTheDocument()
    expect(screen.queryByText('Tutup')).not.toBeInTheDocument()
  })

  it("status 'buka' menampilkan Buka", () => {
    renderCard(makeShop({ openStatus: 'buka' }))
    expect(screen.getByText('Buka')).toBeInTheDocument()
  })

  it('seluruh kartu adalah link ke detail berbasis slug', () => {
    renderCard(makeShop())
    expect(screen.getByRole('link')).toHaveAttribute('href', '/coffee-shops/kopi-abc')
  })

  it('menampilkan "Belum ada ulasan" bila rating null', () => {
    renderCard(makeShop({ rating: null }))
    expect(screen.getByText('Belum ada ulasan')).toBeInTheDocument()
  })

  it('menampilkan jarak bila distanceKm tersedia', () => {
    renderCard(makeShop({ distanceKm: 2.4 }))
    expect(screen.getByText(/2\.4 km/)).toBeInTheDocument()
  })
})