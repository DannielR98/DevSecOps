import { describe, it, expect, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Navbar from '../components/Navbar'
import { renderWithProviders } from './test-utils'
import { mockUseAuth0 } from './setup'

const loggedOutAuth = () => ({
  isAuthenticated: false,
  user: undefined,
  loginWithRedirect: vi.fn(),
  logout: vi.fn(),
  getAccessTokenSilently: vi.fn().mockResolvedValue('test-token'),
  isLoading: false,
})

const loggedInAuthStorage = {
  sub: 'auth0|test-user',
  email: 'test@example.com',
  name: 'Test User',
  nickname: 'tester',
  picture: 'https://example.com/avatar.png',
}

describe('Navbar Component', () => {
  it('should render app title', () => {
    renderWithProviders(<Navbar />)
    expect(screen.getByText(/DevSecOps Quiz/i)).toBeInTheDocument()
  })

  it('should show loading text while Auth0 is loading', () => {
    mockUseAuth0.mockReturnValue({
      ...loggedOutAuth(),
      isLoading: true,
    })
    renderWithProviders(<Navbar />)
    expect(screen.getByText(/Laddar\.\.\./i)).toBeInTheDocument()
  })

  it('should show login button when logged out and trigger login', async () => {
    const loginWithRedirect = vi.fn()
    mockUseAuth0.mockReturnValue({
      ...loggedOutAuth(),
      loginWithRedirect,
    })
    renderWithProviders(<Navbar />)

    const loginButton = screen.getByRole('button', {
      name: /Logga in \/ Skapa konto/i,
    })
    expect(loginButton).toBeInTheDocument()

    await userEvent.click(loginButton)
    expect(loginWithRedirect).toHaveBeenCalledTimes(1)
  })

  it('should show user name and logout when logged in', async () => {
    const logout = vi.fn()
    mockUseAuth0.mockReturnValue({
      isAuthenticated: true,
      user: loggedInAuthStorage,
      loginWithRedirect: vi.fn(),
      logout,
      getAccessTokenSilently: vi.fn().mockResolvedValue('test-token'),
      isLoading: false,
    })
    const { store } = renderWithProviders(<Navbar />, {
      preloadedState: {
        userSlice: { users: [], user: { userStoraged: null, token: null }, userOne: null },
        authSlice: {
          isAuth: true,
          token: 'test-token',
          userStorage: loggedInAuthStorage,
        },
        loadingSlice: { isLoading: false, error: null, fields: [], isSuccess: false },
      },
    })

    expect(screen.getByText('Test User')).toBeInTheDocument()
    const logoutButton = screen.getByRole('button', { name: /Logga ut/i })
    expect(logoutButton).toBeInTheDocument()

    await userEvent.click(logoutButton)
    expect(logout).toHaveBeenCalledTimes(1)
    await waitFor(() => {
      expect(store.getState().authSlice.isAuth).toBe(false)
    })
  })

  it('should open profile dropdown when clicking avatar', async () => {
    mockUseAuth0.mockReturnValue({
      isAuthenticated: true,
      user: loggedInAuthStorage,
      loginWithRedirect: vi.fn(),
      logout: vi.fn(),
      getAccessTokenSilently: vi.fn().mockResolvedValue('test-token'),
      isLoading: false,
    })
    renderWithProviders(<Navbar />, {
      preloadedState: {
        userSlice: { users: [], user: { userStoraged: null, token: null }, userOne: null },
        authSlice: {
          isAuth: true,
          token: 'test-token',
          userStorage: loggedInAuthStorage,
        },
        loadingSlice: { isLoading: false, error: null, fields: [], isSuccess: false },
      },
    })

    const avatar = screen.getByAltText('Test User')
    await userEvent.click(avatar)
    expect(screen.getByText(/Användarinfo/i)).toBeInTheDocument()
  })
})
