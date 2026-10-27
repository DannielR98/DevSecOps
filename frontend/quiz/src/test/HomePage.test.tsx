import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import HomePage from '../page/home/HomePage'
import { renderWithProviders } from './test-utils'
import { mockUseAuth } from './setup'

const authUser = {
  sub: 'supabase|test-user',
  email: 'test@example.com',
  name: 'Test User',
  nickname: 'tester',
  picture: 'https://example.com/avatar.png',
}

describe('HomePage', () => {
  it('should show landing content when logged out', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      user: undefined,
      loginWithRedirect: vi.fn(),
      logout: vi.fn(),
      getAccessTokenSilently: vi.fn(),
      isLoading: false,
      openAuthModal: vi.fn(),
      closeAuthModal: vi.fn(),
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

  it('should show loading state while auth resolves', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      user: undefined,
      loginWithRedirect: vi.fn(),
      logout: vi.fn(),
      getAccessTokenSilently: vi.fn(),
      isLoading: true,
      openAuthModal: vi.fn(),
      closeAuthModal: vi.fn(),
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
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      user: authUser,
      loginWithRedirect: vi.fn(),
      logout: vi.fn(),
      getAccessTokenSilently: vi.fn().mockResolvedValue('test-token'),
      isLoading: false,
      openAuthModal: vi.fn(),
      closeAuthModal: vi.fn(),
    })
    renderWithProviders(<HomePage />, {
      preloadedState: {
        userSlice: {
          users: [
            {
              id: 1,
              firstname: 'Test',
              surname: 'User',
              username: 'tester',
              email: 'test@example.com',
              supabase_id: 'supabase|test-user',
            },
          ],
          user: { userStoraged: null, token: null },
          userOne: {
            id: 1,
            firstname: 'Test',
            surname: 'User',
            username: 'tester',
            email: 'test@example.com',
            supabase_id: 'supabase|test-user',
          },
        },
        authSlice: { isAuth: true, token: 'test-token', userStorage: authUser },
        loadingSlice: { isLoading: false, error: null, fields: [], isSuccess: false },
      },
    })

    expect(screen.getByText(/Mina Quizgrupper/i)).toBeInTheDocument()
  })
})
