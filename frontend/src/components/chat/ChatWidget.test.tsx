import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, within, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import App from '../../App'
import * as chatService from '../../services/chat'
import type { ChatShop } from '../../services/chat'

vi.mock('../../services/chat', async (importOriginal) => {
  const actual = await importOriginal<typeof chatService>()
  return { ...actual, sendChatMessage: vi.fn() }
})

// Stub halaman: test ini fokus pada guard rute + widget, bukan isi halaman.
// (Sekaligus menghindari animasi framer-motion halaman di happy-dom.)
vi.mock('../../pages/Home', () => ({ default: () => <div>Home stub</div> }))
vi.mock('../../pages/CoffeeShopExplorer', () => ({ default: () => <div>Explorer stub</div> }))
vi.mock('../../pages/CoffeeShopDetail', () => ({ default: () => <div>Detail stub</div> }))
vi.mock('../../pages/Login', () => ({ default: () => <div>Login stub</div> }))
vi.mock('../../pages/Register', () => ({ default: () => <div>Register stub</div> }))
vi.mock('../../pages/NotFound', () => ({ default: () => <div>NotFound stub</div> }))

const sendMock = vi.mocked(chatService.sendChatMessage)

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
    openStatus: 'buka',
    ...overrides,
  }
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>
  )
}

async function openPanel() {
  fireEvent.click(screen.getByRole('button', { name: 'Buka chat' }))
  const dialog = await screen.findByRole('dialog')
  return dialog
}

describe('ChatWidget - visibilitas rute', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    sendMock.mockResolvedValue({ reply: 'ok' })
  })

  afterEach(() => {
    Object.defineProperty(navigator, 'geolocation', {
      value: undefined,
      configurable: true,
      writable: true,
    })
  })

  it.each(['/', '/coffee-shops', '/coffee-shops/kopi-abc'])(
    'menampilkan widget di %s',
    (path) => {
      renderAt(path)
      expect(screen.getByRole('button', { name: 'Buka chat' })).toBeInTheDocument()
    }
  )

  it.each(['/login', '/register', '/admin/dashboard', '/owner/dashboard', '/halaman-acak'])(
    'tidak menampilkan widget di %s',
    (path) => {
      renderAt(path)
      expect(screen.queryByRole('button', { name: 'Buka chat' })).not.toBeInTheDocument()
    }
  )

  it('klik membuka panel dan Esc menutup', async () => {
    renderAt('/')
    const dialog = await openPanel()
    expect(dialog).toBeInTheDocument()

    fireEvent.keyDown(document, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('chip saran mengirim pesan', async () => {
    sendMock.mockResolvedValue({ reply: 'Ngopi Jember adalah direktori kafe.' })
    renderAt('/')
    const dialog = await openPanel()

    fireEvent.click(within(dialog).getByRole('button', { name: 'Apa itu Ngopi Jember?' }))

    await waitFor(() =>
      expect(sendMock).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Apa itu Ngopi Jember?' })
      )
    )
    expect(await within(dialog).findByText('Ngopi Jember adalah direktori kafe.')).toBeInTheDocument()
  })

  it('tombol kirim nonaktif saat kosong, lalu balasan dan kartu kedai muncul', async () => {
    sendMock.mockResolvedValue({ reply: 'Ini rekomendasinya', shops: [makeShop()] })
    renderAt('/')
    const dialog = await openPanel()

    const sendButton = within(dialog).getByRole('button', { name: 'Kirim pesan' })
    expect(sendButton).toBeDisabled()

    fireEvent.change(within(dialog).getByPlaceholderText('Tulis pesan…'), {
      target: { value: 'cari kafe' },
    })
    expect(sendButton).not.toBeDisabled()
    fireEvent.click(sendButton)

    expect(await within(dialog).findByText('Ini rekomendasinya')).toBeInTheDocument()
    expect(within(dialog).getByRole('link')).toHaveAttribute('href', '/coffee-shops/kopi-abc')
  })

  it('teks berbahaya dirender sebagai teks biasa (tidak ada <img>)', async () => {
    const payload = '<img src=x onerror=alert(1)>'
    sendMock.mockResolvedValue({ reply: payload })
    const { container } = renderAt('/')
    const dialog = await openPanel()

    fireEvent.change(within(dialog).getByPlaceholderText('Tulis pesan…'), {
      target: { value: 'halo' },
    })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Kirim pesan' }))

    expect(await within(dialog).findByText(payload)).toBeInTheDocument()
    expect(container.querySelector('img')).toBeNull()
  })

  it('menampilkan blok izin lokasi dan mengirim ulang pesan dengan koordinat', async () => {
    const getCurrentPosition = vi.fn((success: PositionCallback) => {
      success({ coords: { latitude: -8.172, longitude: 113.701 } } as GeolocationPosition)
    })
    Object.defineProperty(navigator, 'geolocation', {
      value: { getCurrentPosition },
      configurable: true,
      writable: true,
    })
    Object.defineProperty(window, 'isSecureContext', { value: true, configurable: true })

    sendMock.mockResolvedValueOnce({ reply: 'butuh lokasi', needsLocation: true })
    sendMock.mockResolvedValueOnce({ reply: 'ini kedai terdekat' })

    renderAt('/')
    const dialog = await openPanel()

    fireEvent.change(within(dialog).getByPlaceholderText('Tulis pesan…'), {
      target: { value: 'dekat sini' },
    })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Kirim pesan' }))

    expect(await within(dialog).findByText(/aku butuh lokasimu ya/i)).toBeInTheDocument()
    // Belum diklik -> geolocation belum terpanggil.
    expect(getCurrentPosition).not.toHaveBeenCalled()

    fireEvent.click(within(dialog).getByRole('button', { name: 'Izinkan lokasi' }))

    expect(await within(dialog).findByText('ini kedai terdekat')).toBeInTheDocument()
    expect(getCurrentPosition).toHaveBeenCalledTimes(1)
  })
})