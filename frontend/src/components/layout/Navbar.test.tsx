import { render, screen, fireEvent } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import Navbar from './Navbar'

describe('Navbar Component', () => {
  it('renders brand title and navigation links', () => {
    render(
      <BrowserRouter>
        <Navbar />
      </BrowserRouter>
    )

    expect(screen.getByText('Ngopi')).toBeInTheDocument()
    expect(screen.getByText('Jember')).toBeInTheDocument()
    expect(screen.getByText('Beranda')).toBeInTheDocument()
    expect(screen.getByText('Jelajahi')).toBeInTheDocument()
    expect(screen.getByText('Masuk')).toBeInTheDocument()
  })

  it('toggles mobile menu when hamburger button is clicked', () => {
    render(
      <BrowserRouter>
        <Navbar />
      </BrowserRouter>
    )

    const menuButton = screen.getByRole('button', { name: /buka menu/i })
    expect(menuButton).toBeInTheDocument()

    fireEvent.click(menuButton)
    expect(screen.getAllByText('Beranda').length).toBeGreaterThan(1)

    fireEvent.click(menuButton)
  })
})
