import '@testing-library/jest-dom/vitest'
import { vi, beforeEach } from 'vitest'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyArgs = any[]
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyResult = any

const { mockUseAuth, mockApiRequest } = vi.hoisted(() => {
  return {
    mockUseAuth: vi.fn((): AnyResult => ({})),
    mockApiRequest: vi.fn(
      async (..._args: AnyArgs): Promise<AnyResult> => ({ groups: [] }),
    ),
  }
})

vi.mock('../context/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
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

const defaultAuthValue = () => ({
  isAuthenticated: true,
  user: {
    sub: 'supabase|test-user',
    email: 'test@example.com',
    name: 'Test User',
    nickname: 'tester',
    picture: 'https://example.com/avatar.png',
  },
  loginWithRedirect: vi.fn(),
  logout: vi.fn(),
  getAccessTokenSilently: vi.fn().mockResolvedValue('test-token'),
  isLoading: false,
  openAuthModal: vi.fn(),
  closeAuthModal: vi.fn(),
})

mockUseAuth.mockImplementation(defaultAuthValue)
mockApiRequest.mockImplementation(defaultApiResult)

beforeEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
  // Re-apply default implementations after clearAllMocks (which clears them)
  mockUseAuth.mockImplementation(defaultAuthValue)
  mockApiRequest.mockImplementation(defaultApiResult)
})

export { mockUseAuth, mockApiRequest }
