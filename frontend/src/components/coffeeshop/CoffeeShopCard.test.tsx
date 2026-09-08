import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import CoffeeShopCard from './CoffeeShopCard'
import type { CoffeeShop } from '../../types/coffeeShop'

const mockShop: CoffeeShop = {
  id: '1',
  slug: 'kopi-jember-kita',
  name: 'Kopi Jember Kita',
  description: 'Kedai kopi nikmat di Sumbersari',
  district: 'Sumbersari',
  address: 'Jl. Kalimantan No. 35',
  priceRange: 'Rp15.000 - Rp40.000',
  rating: 4.8,
  reviewCount: 12,
  facilities: ['Wi-Fi', 'AC'],
  imageUrl: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085',
  isFeatured: true,
  isOpenNow: true,
}

describe('CoffeeShopCard Component', () => {
  it('renders coffee shop details correctly', () => {
    render(
      <BrowserRouter>
        <CoffeeShopCard coffeeShop={mockShop} />
      </BrowserRouter>
    )

    expect(screen.getByText('Kopi Jember Kita')).toBeInTheDocument()
    expect(screen.getByText('Sumbersari')).toBeInTheDocument()
    expect(screen.getByText('Rp15.000 - Rp40.000')).toBeInTheDocument()
    expect(screen.getByText('Featured')).toBeInTheDocument()
    expect(screen.getByText('Wi-Fi')).toBeInTheDocument()
    expect(screen.getByText('AC')).toBeInTheDocument()
  })
})
