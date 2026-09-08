import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import CoffeeShopExplorer from './CoffeeShopExplorer'
import * as coffeeShopService from '../services/coffeeShop'

vi.mock('../services/coffeeShop', async (importOriginal) => {
  const actual = await importOriginal<typeof coffeeShopService>()
  return {
    ...actual,
    listCoffeeShops: vi.fn(),
    listFacilities: vi.fn(),
    getImageUrl: vi.fn((url) => url),
  }
})

const mockShops = [
  {
    id: '1',
    name: 'Kopi Jember Asik',
    slug: 'kopi-jember-asik',
    district: 'Sumbersari',
    priceRange: 'Rp15.000 - Rp30.000',
    isFeatured: true,
    status: 'OPEN',
    image: null,
    facilities: [{ id: 'f1', name: 'Wi-Fi', slug: 'wifi' }],
    rating: 4.7,
    reviewCount: 10,
  },
  {
    id: '2',
    name: 'Kaliwates Coffee',
    slug: 'kaliwates-coffee',
    district: 'Kaliwates',
    priceRange: 'Rp20.000 - Rp50.000',
    isFeatured: false,
    status: 'CLOSED',
    image: null,
    facilities: [{ id: 'f2', name: 'AC', slug: 'ac' }],
    rating: 4.2,
    reviewCount: 5,
  },
]

const mockFacilities = [
  { id: 'f1', name: 'Wi-Fi', slug: 'wifi' },
  { id: 'f2', name: 'AC', slug: 'ac' },
]

describe('CoffeeShopExplorer Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(coffeeShopService.listFacilities).mockResolvedValue({ data: mockFacilities })
  })

  it('renders loading state initially and then displays coffee shops', async () => {
    vi.mocked(coffeeShopService.listCoffeeShops).mockResolvedValue({ data: mockShops })

    render(
      <BrowserRouter>
        <CoffeeShopExplorer />
      </BrowserRouter>
    )

    expect(screen.getByText('Memuat coffee shop...')).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText('Kopi Jember Asik')).toBeInTheDocument()
      expect(screen.getByText('Kaliwates Coffee')).toBeInTheDocument()
    })

    expect(screen.getByText((_, node) => node?.textContent === '2 coffee shop ditemukan')).toBeInTheDocument()
  })

  it('renders empty state when no coffee shops are found', async () => {
    vi.mocked(coffeeShopService.listCoffeeShops).mockResolvedValue({ data: [] })

    render(
      <BrowserRouter>
        <CoffeeShopExplorer />
      </BrowserRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Coffee shop tidak ditemukan')).toBeInTheDocument()
    })
  })

  it('renders error message when API request fails', async () => {
    vi.mocked(coffeeShopService.listCoffeeShops).mockRejectedValue(new coffeeShopService.ApiError('Gagal memuat dari server'))

    render(
      <BrowserRouter>
        <CoffeeShopExplorer />
      </BrowserRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Gagal memuat dari server')).toBeInTheDocument()
    })
  })

  it('allows user to type search query and resets filter', async () => {
    vi.mocked(coffeeShopService.listCoffeeShops).mockResolvedValue({ data: [mockShops[0]] })

    render(
      <BrowserRouter>
        <CoffeeShopExplorer />
      </BrowserRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Kopi Jember Asik')).toBeInTheDocument()
    })

    const searchInput = screen.getByPlaceholderText('Cari coffee shop atau kecamatan...')
    fireEvent.change(searchInput, { target: { value: 'Asik' } })

    expect(searchInput).toHaveValue('Asik')

    const resetButton = screen.getByRole('button', { name: /reset filter/i })
    fireEvent.click(resetButton)

    expect(searchInput).toHaveValue('')
  })
})
