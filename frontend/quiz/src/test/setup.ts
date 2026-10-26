import '@testing-library/jest-dom/vitest'
import { vi, beforeEach } from 'vitest'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyArgs = any[]
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyResult = any

const { mockUseAuth0, mockApiRequest } = vi.hoisted(() => {
  return {
    mockUseAuth0: vi.fn((): AnyResult => ({})),
    mockApiRequest: vi.fn(
      async (..._args: AnyArgs): Promise<AnyResult> => ({ groups: [] }),
    ),
  }
})

vi.mock('@auth0/auth0-react', () => ({
  useAuth0: () => mockUseAuth0(),
}))

vi.mock('../context/AuthContext', () => ({
  useAuth: () => mockUseAuth0(),
  useAuth0: () => mockUseAuth0(),
  AuthProvider: ({ children }: any) => children,
}))

vi.mock('../supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
      signInWithPassword: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      signUp: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
  },
}))

vi.mock('../utilities/HeaderFunction', () => ({
  apiRequest: mockApiRequest,
}))

// jsdom lacks IntersectionObserver (used by Reveal) — stub it
class MockIntersectionObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

vi.stubGlobal('IntersectionObserver', MockIntersectionObserver)

if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView =
    vi.fn() as unknown as typeof Element.prototype.scrollIntoView
}

const defaultApiResult = async (...args: AnyArgs): Promise<AnyResult> => {
  const params = args[0] as { api?: string } | undefined
  if (params?.api === 'groups') {
    return { groups: [] }
  }
  if (params?.api === 'quizzes') {
    return { quizzes: [] }
  }
  return {}
}

const defaultAuth0Value = () => ({
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
})

mockUseAuth0.mockImplementation(defaultAuth0Value)
mockApiRequest.mockImplementation(defaultApiResult)

beforeEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
  // Re-apply default implementations after clearAllMocks (which clears them)
  mockUseAuth0.mockImplementation(defaultAuth0Value)
  mockApiRequest.mockImplementation(defaultApiResult)
})

const mockUseAuth = mockUseAuth0
export { mockUseAuth0, mockUseAuth, mockApiRequest }
