import { describe, it, expect, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import QuizManager from '../components/QuizManager'
import { renderWithProviders } from './test-utils'
import { mockApiRequest, mockUseAuth0 } from './setup'
import { apiRequest } from '../utilities/HeaderFunction'

const demoGroups = [{ id: 1, name: 'Grupp A' }]

const demoQuiz = {
  id: 10,
  title: 'Säkerhetsquiz',
  category: 'DevSecOps',
  group_id: 1,
  group_name: 'Grupp A',
  is_creator: false,
  questions: [
    {
      question: 'Vad är XSS?',
      options: ['En attack', 'Ett ramverk', 'Ett protokoll', 'En databas'],
      correctAnswer: 0,
    },
  ],
  createdAt: '2026-03-01T10:00:00.000Z',
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mockQuizBackend(impl: (...args: any[]) => Promise<any>) {
  mockApiRequest.mockImplementation(impl)
}

describe('QuizManager Component', () => {
  it('should render quiz manager', () => {
    renderWithProviders(<QuizManager />)
    expect(screen.getByText(/🎯 Quiz/i)).toBeInTheDocument()
  })

  it('should render nothing when not logged in', () => {
    mockUseAuth0.mockReturnValue({
      isAuthenticated: false,
      user: undefined,
      loginWithRedirect: vi.fn(),
      logout: vi.fn(),
      getAccessTokenSilently: vi.fn(),
      isLoading: false,
    })
    const { container } = renderWithProviders(<QuizManager />, {
      preloadedState: {
        userSlice: { users: [], user: { userStoraged: null, token: null }, userOne: null },
        authSlice: { isAuth: false, token: null, userStorage: null },
        loadingSlice: { isLoading: false, error: null, fields: [], isSuccess: false },
      },
    })
    expect(container).toBeEmptyDOMElement()
  })

  it('should show empty message when no quizzes exist', async () => {
    renderWithProviders(<QuizManager />)
    expect(
      await screen.findByText(/Inga quiz tillgängliga ännu/i),
    ).toBeInTheDocument()
  })

  it('should render quiz list with start button', async () => {
    mockQuizBackend(async ({ api }: { api: string }) => {
      if (api === 'groups') return { groups: demoGroups }
      if (api === 'quizzes') return { quizzes: [demoQuiz] }
      return {}
    })
    renderWithProviders(<QuizManager />)

    expect(await screen.findByText('Säkerhetsquiz')).toBeInTheDocument()
    expect(screen.getByText(/1 Frågor/i)).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /Starta quiz/i }),
    ).toBeInTheDocument()
  })

  it('should open quiz player, answer and submit for a result', async () => {
    const user = userEvent.setup()
    mockQuizBackend(async ({ api, endpoint }: { api: string; endpoint?: string }) => {
      if (api === 'groups') return { groups: demoGroups }
      if (api === 'quizzes' && endpoint === '/10/submit') {
        return { result: { score: 1, total_questions: 1, percentage: 100 } }
      }
      if (api === 'quizzes') return { quizzes: [demoQuiz] }
      return {}
    })
    renderWithProviders(<QuizManager />)
    await user.click(await screen.findByRole('button', { name: /Starta quiz/i }))

    // Player modal shows the question
    expect(screen.getByText(/Vad är XSS\?/i)).toBeInTheDocument()
    const submitButton = screen.getByRole('button', { name: /Lämna in svar/i })
    expect(submitButton).toBeDisabled()

    await user.click(screen.getByText('En attack'))
    expect(submitButton).not.toBeDisabled()

    await user.click(submitButton)
    expect(
      await screen.findByText(/Resultat: 1 \/ 1 \(100%\)/i),
    ).toBeInTheDocument()
  })

  it('should close quiz player when clicking Avbryt', async () => {
    const user = userEvent.setup()
    mockQuizBackend(async ({ api }: { api: string }) => {
      if (api === 'groups') return { groups: demoGroups }
      if (api === 'quizzes') return { quizzes: [demoQuiz] }
      return {}
    })
    renderWithProviders(<QuizManager />)
    await user.click(await screen.findByRole('button', { name: /Starta quiz/i }))
    expect(screen.getByText(/Vad är XSS\?/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Avbryt/i }))
    await waitFor(() => {
      expect(screen.queryByText(/Vad är XSS\?/i)).not.toBeInTheDocument()
    })
  })

  it('should open create modal when groups exist', async () => {
    const user = userEvent.setup()
    mockQuizBackend(async ({ api }: { api: string }) => {
      if (api === 'groups') return { groups: demoGroups }
      return { quizzes: [] }
    })
    renderWithProviders(<QuizManager />)

    await user.click(
      screen.getByRole('button', { name: /\+ Skapa nytt quiz/i }),
    )
    expect(await screen.findByText('Skapa nytt quiz')).toBeInTheDocument()
    expect(screen.getByText('Quiztitel')).toBeInTheDocument()
    expect(screen.getByText('Målgrupp')).toBeInTheDocument()
  })

  it('should alert when trying to create quiz without any group', async () => {
    const user = userEvent.setup()
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})
    mockQuizBackend(async () => ({ groups: [], quizzes: [] }))
    renderWithProviders(<QuizManager />)

    await user.click(
      screen.getByRole('button', { name: /\+ Skapa nytt quiz/i }),
    )

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        expect.stringContaining('skapa en grupp'),
      )
    })
    alertSpy.mockRestore()
  })

  it('should add an extra question in the create form', async () => {
    const user = userEvent.setup()
    mockQuizBackend(async ({ api }: { api: string }) => {
      if (api === 'groups') return { groups: demoGroups }
      return { quizzes: [] }
    })
    renderWithProviders(<QuizManager />)

    await user.click(
      screen.getByRole('button', { name: /\+ Skapa nytt quiz/i }),
    )
    await screen.findByText('Skapa nytt quiz')

    await user.click(
      screen.getByRole('button', { name: /\+ Lägg till en till fråga/i }),
    )
    expect(screen.getByText('Fråga #2')).toBeInTheDocument()
  })

  it('should save a new quiz via POST', async () => {
    const user = userEvent.setup()
    mockQuizBackend(async ({ api, method }: { api: string; method?: string }) => {
      if (api === 'groups') return { groups: demoGroups }
      if (api === 'quizzes' && method === 'POST') return { id: 99 }
      return { quizzes: [] }
    })
    renderWithProviders(<QuizManager />)

    await user.click(
      screen.getByRole('button', { name: /\+ Skapa nytt quiz/i }),
    )
    await screen.findByText('Skapa nytt quiz')

    await user.type(
      screen.getByPlaceholderText('t.ex. Grunderna i DevSecOps'),
      'Mitt nya quiz',
    )
    await user.type(
      screen.getByPlaceholderText('Skriv frågetext...'),
      'Vad är DevSecOps?',
    )
    await user.type(screen.getByPlaceholderText('Alternativ 1'), 'Svar A')
    await user.type(screen.getByPlaceholderText('Alternativ 2'), 'Svar B')
    await user.type(screen.getByPlaceholderText('Alternativ 3'), 'Svar C')
    await user.type(screen.getByPlaceholderText('Alternativ 4'), 'Svar D')
    await user.click(screen.getByRole('button', { name: /Spara quiz/i }))

    await waitFor(() => {
      expect(apiRequest).toHaveBeenCalledWith(
        expect.objectContaining({ api: 'quizzes', method: 'POST' }),
      )
    })
  })

  it('should delete a quiz after confirm', async () => {
    const user = userEvent.setup()
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    const creatorQuiz = { ...demoQuiz, is_creator: true }
    mockQuizBackend(async ({ api }: { api: string }) => {
      if (api === 'groups') return { groups: demoGroups }
      if (api === 'quizzes') return { quizzes: [creatorQuiz] }
      return {}
    })
    renderWithProviders(<QuizManager />)

    await user.click(await screen.findByRole('button', { name: /Ta bort/i }))

    await waitFor(() => {
      expect(apiRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          api: 'quizzes',
          endpoint: '/10',
          method: 'DELETE',
        }),
      )
    })
    confirmSpy.mockRestore()
  })
})
