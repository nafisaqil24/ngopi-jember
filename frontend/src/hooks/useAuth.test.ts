import { renderHook, act } from '@testing-library/react'
import { useAuth } from './useAuth'

describe('useAuth Hook', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('returns unauthenticated state initially when localStorage is empty', () => {
    const { result } = renderHook(() => useAuth())

    expect(result.current.user).toBeNull()
    expect(result.current.token).toBeNull()
    expect(result.current.isAuthenticated).toBe(false)
  })

  it('returns authenticated state when token and user exist in localStorage', () => {
    const mockUser = { id: '1', name: 'Test User', email: 'test@example.com', role: 'OWNER' }
    localStorage.setItem('ngopi_jember_token', 'mock-token-123')
    localStorage.setItem('ngopi_jember_user', JSON.stringify(mockUser))

    const { result } = renderHook(() => useAuth())

    expect(result.current.token).toBe('mock-token-123')
    expect(result.current.user).toEqual(mockUser)
    expect(result.current.isAuthenticated).toBe(true)
  })

  it('clears session and updates state correctly on logout', () => {
    const mockUser = { id: '1', name: 'Test User', email: 'test@example.com', role: 'OWNER' }
    localStorage.setItem('ngopi_jember_token', 'mock-token-123')
    localStorage.setItem('ngopi_jember_user', JSON.stringify(mockUser))

    const { result } = renderHook(() => useAuth())

    expect(result.current.isAuthenticated).toBe(true)

    act(() => {
      result.current.logout()
    })

    expect(localStorage.getItem('ngopi_jember_token')).toBeNull()
    expect(localStorage.getItem('ngopi_jember_user')).toBeNull()
    expect(result.current.user).toBeNull()
    expect(result.current.token).toBeNull()
    expect(result.current.isAuthenticated).toBe(false)
  })
})
