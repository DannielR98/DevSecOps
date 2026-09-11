import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import HomePage from '../page/home/HomePage'
import { renderWithProviders } from './test-utils'
import { mockUseAuth0 } from './setup'

const authUser = {
  sub: 'auth0|test-user',
  email: 'test@example.com',
  name: 'Test User',
  nickname: 'tester',
  picture: 'https://example.com/avatar.png',
}

describe('HomePage', () => {
  it('should show landing content when logged out', () => {
    mockUseAuth0.mockReturnValue({
      isAuthenticated: false,
      user: undefined,
      loginWithRedirect: vi.fn(),
      logout: vi.fn(),
      getAccessTokenSilently: vi.fn(),
      isLoading: false,
    })
    renderWithProviders(<HomePage />, {
      preloadedState: {
        userSlice: { users: [], user: { userStoraged: null, token: null }, userOne: null },
        authSlice: { isAuth: false, token: null, userStorage: null },
        loadingSlice: { isLoading: false, error: null, fields: [], isSuccess: false },
      },
    })

    expect(screen.getAllByText(/Skapa Quiz/i).length).toBeGreaterThan(0)
    expect(screen.getByText(/Hur det fungerar/i)).toBeInTheDocument()
  })

  it('should show loading state while Auth0 resolves', () => {
    mockUseAuth0.mockReturnValue({
      isAuthenticated: false,
      user: undefined,
      loginWithRedirect: vi.fn(),
      logout: vi.fn(),
      getAccessTokenSilently: vi.fn(),
      isLoading: true,
    })
    renderWithProviders(<HomePage />, {
      preloadedState: {
        userSlice: { users: [], user: { userStoraged: null, token: null }, userOne: null },
        authSlice: { isAuth: false, token: null, userStorage: null },
        loadingSlice: { isLoading: false, error: null, fields: [], isSuccess: false },
      },
    })

    expect(screen.getByText(/Laddar inloggningsstatus/i)).toBeInTheDocument()
  })

  it('should show dashboards when logged in', async () => {
    mockUseAuth0.mockReturnValue({
      isAuthenticated: true,
      user: authUser,
      loginWithRedirect: vi.fn(),
      logout: vi.fn(),
      getAccessTokenSilently: vi.fn().mockResolvedValue('test-token'),
      isLoading: false,
    })
    renderWithProviders(<HomePage />, {
      preloadedState: {
        userSlice: { users: [], user: { userStoraged: null, token: null }, userOne: null },
        authSlice: { isAuth: true, token: 'test-token', userStorage: authUser },
        loadingSlice: { isLoading: false, error: null, fields: [], isSuccess: false },
      },
    })

    expect(await screen.findByText(/Hej, Test User!/i)).toBeInTheDocument()
    expect(
      await screen.findByRole('heading', { name: /Mina Quizgrupper/i }),
    ).toBeInTheDocument()
    expect(screen.getByText(/🎯 Quiz/i)).toBeInTheDocument()
  })
})
