import { describe, it, expect, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import GroupDashboard from '../components/GroupDashboard'
import { renderWithProviders } from './test-utils'
import { mockApiRequest } from './setup'
import { apiRequest } from '../utilities/HeaderFunction'

const demoGroups = [
  {
    id: 1,
    name: 'Grupp Ett',
    invite_code: 'ABC123',
    owner_id: 1,
    is_owner: true,
    createdAt: '2026-01-15T10:00:00.000Z',
  },
  {
    id: 2,
    name: 'Grupp Två',
    owner_id: 2,
    is_owner: false,
    createdAt: '2026-02-20T10:00:00.000Z',
  },
]

describe('GroupDashboard Component', () => {
  it('should render group dashboard', async () => {
    renderWithProviders(<GroupDashboard />)
    expect(
      await screen.findByRole('heading', { name: /Mina Quizgrupper/i }),
    ).toBeInTheDocument()
  })

  it('should have input for group name', () => {
    renderWithProviders(<GroupDashboard />)
    const input = screen.getByPlaceholderText('Gruppnamn...')
    expect(input).toBeInTheDocument()
  })

  it('should show empty message when there are no groups', async () => {
    renderWithProviders(<GroupDashboard />)
    expect(
      await screen.findByText(/Inga grupper skapade eller anslutna ännu/i),
    ).toBeInTheDocument()
  })

  it('should render groups with owner badge and invite code', async () => {
    mockApiRequest.mockResolvedValue({ groups: demoGroups })
    renderWithProviders(<GroupDashboard />)

    expect(await screen.findByText('Grupp Ett')).toBeInTheDocument()
    expect(screen.getByText('Grupp Två')).toBeInTheDocument()
    expect(screen.getByText('Ägare')).toBeInTheDocument()
    expect(screen.getByText('ABC123')).toBeInTheDocument()
  })

  it('should create a group and show success message', async () => {
    const user = userEvent.setup()
    mockApiRequest.mockImplementation(async (args: { api: string; method?: string }) => {
      if (args.api === 'groups' && args.method === 'POST') return {}
      return { groups: [] }
    })
    renderWithProviders(<GroupDashboard />)
    await screen.findByRole('heading', { name: /Mina Quizgrupper/i })

    await user.type(screen.getByPlaceholderText('Gruppnamn...'), 'Ny grupp')
    await user.click(screen.getByRole('button', { name: /\+ Skapa/i }))

    expect(await screen.findByText('Gruppen har skapats!')).toBeInTheDocument()
    expect(apiRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        api: 'groups',
        method: 'POST',
        body: { name: 'Ny grupp' },
      }),
    )
  })

  it('should not submit create-group when input is empty', async () => {
    const user = userEvent.setup()
    renderWithProviders(<GroupDashboard />)
    await screen.findByRole('heading', { name: /Mina Quizgrupper/i })

    await user.click(screen.getByRole('button', { name: /\+ Skapa/i }))
    expect(apiRequest).not.toHaveBeenCalledWith(
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('should uppercase invite code while typing', async () => {
    const user = userEvent.setup()
    renderWithProviders(<GroupDashboard />)
    const input = screen.getByPlaceholderText('t.ex. EXAM24')

    await user.type(input, 'exam24')
    expect(input).toHaveValue('EXAM24')
  })

  it('should join a group and show success message', async () => {
    const user = userEvent.setup()
    mockApiRequest.mockImplementation(async (args: { api: string; method?: string }) => {
      if (args.api === 'groups/join') return { message: 'Gick med i gruppen!' }
      return { groups: [] }
    })
    renderWithProviders(<GroupDashboard />)

    await user.type(screen.getByPlaceholderText('t.ex. EXAM24'), 'EXAM24')
    await user.click(screen.getByRole('button', { name: /Gå med/i }))

    expect(await screen.findByText('Gick med i gruppen!')).toBeInTheDocument()
    expect(apiRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        api: 'groups/join',
        body: { invite_code: 'EXAM24' },
      }),
    )
  })

  it('should show error message when create fails', async () => {
    const user = userEvent.setup()
    mockApiRequest.mockImplementation(async (args: { api: string; method?: string }) => {
      if (args.api === 'groups' && args.method === 'POST') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const err: any = new Error('Request failed')
        err.response = { data: { message: 'Gruppnamnet är upptaget' } }
        throw err
      }
      return { groups: [] }
    })
    renderWithProviders(<GroupDashboard />)

    await user.type(screen.getByPlaceholderText('Gruppnamn...'), 'Dubblett')
    await user.click(screen.getByRole('button', { name: /\+ Skapa/i }))

    expect(await screen.findByText('Gruppnamnet är upptaget')).toBeInTheDocument()
  })

  it('should delete a group after confirm', async () => {
    const user = userEvent.setup()
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    mockApiRequest.mockImplementation(async (args: { api: string; method?: string }) => {
      if (args.method === 'GET') return { groups: demoGroups }
      return {}
    })
    renderWithProviders(<GroupDashboard />)
    await screen.findByText('Grupp Ett')

    await user.click(screen.getAllByRole('button', { name: /Ta bort/i })[0])

    await waitFor(() => {
      expect(apiRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          api: 'groups',
          endpoint: '/1',
          method: 'DELETE',
        }),
      )
    })
    confirmSpy.mockRestore()
  })

  it('should not delete a group when confirm is cancelled', async () => {
    const user = userEvent.setup()
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)
    mockApiRequest.mockResolvedValue({ groups: demoGroups })
    renderWithProviders(<GroupDashboard />)
    await screen.findByText('Grupp Ett')

    await user.click(screen.getAllByRole('button', { name: /Ta bort/i })[0])

    expect(apiRequest).not.toHaveBeenCalledWith(
      expect.objectContaining({ method: 'DELETE' }),
    )
    confirmSpy.mockRestore()
  })

  it('should open edit mode with current group name', async () => {
    const user = userEvent.setup()
    mockApiRequest.mockResolvedValue({ groups: demoGroups })
    renderWithProviders(<GroupDashboard />)
    await screen.findByText('Grupp Ett')

    await user.click(screen.getByRole('button', { name: /Redigera namn/i }))

    const editInput = screen.getByDisplayValue('Grupp Ett')
    expect(editInput).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Spara/i })).toBeInTheDocument()
  })
})
