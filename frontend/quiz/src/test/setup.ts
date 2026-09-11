import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'

vi.mock('@auth0/auth0-react', () => ({
  useAuth0: () => ({
    isAuthenticated: true,
    user: {
      sub: 'auth0|test-user',
      email: 'test@example.com',
      name: 'Test User',
      nickname: 'tester',
      picture: 'https://example.com/avatar.png',
    },
    loginWithRedirect: vi.fn(),
    logout: vi.fn(),
    getAccessTokenSilently: vi.fn().mockResolvedValue('test-token'),
    isLoading: false,
  }),
}))

vi.mock('../utilities/HeaderFunction', () => ({
  apiRequest: vi.fn(async ({ api }) => {
    if (api === 'groups') {
      return { groups: [] }
    }

    if (api === 'quizzes') {
      return { quizzes: [] }
    }

    return {}
  }),
}))