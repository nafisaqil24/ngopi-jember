import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import Navbar from './Navbar'

describe('Navbar Component', () => {
  it('renders navigation links', () => {
    render(
      <BrowserRouter>
        <Navbar />
      </BrowserRouter>
    )
    expect(screen.getByText(/Ngopi/i)).toBeInTheDocument()
    expect(screen.getByText(/Jember/i)).toBeInTheDocument()
  })
})
