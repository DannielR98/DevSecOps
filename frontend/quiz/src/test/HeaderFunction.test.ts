import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockAxiosRequest } = vi.hoisted(() => {
  const mockAxiosRequest = vi.fn()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(mockAxiosRequest as any).interceptors = {
    response: { use: vi.fn((onSuccess) => onSuccess) },
  }
  return { mockAxiosRequest }
})

vi.mock('axios', () => ({
  default: {
    create: () => mockAxiosRequest,
  },
}))

// Import the real implementation, bypassing the global HeaderFunction mock in setup.ts
const { apiRequest } = await vi.importActual<
  typeof import('../utilities/HeaderFunction')
>('../utilities/HeaderFunction')

describe('apiRequest', () => {
  beforeEach(() => {
    mockAxiosRequest.mockReset()
  })

  it('should GET without auth header when no token is given', async () => {
    mockAxiosRequest.mockResolvedValueOnce({ data: { groups: [] } })

    const result = await apiRequest({ api: 'groups', method: 'GET' })

    expect(result).toEqual({ groups: [] })
    expect(mockAxiosRequest).toHaveBeenCalledWith({
      url: '/groups',
      method: 'GET',
      headers: undefined,
      data: undefined,
    })
  })

  it('should send Bearer token and body on POST', async () => {
    mockAxiosRequest.mockResolvedValueOnce({ data: { ok: true } })

    const result = await apiRequest({
      api: 'groups/join',
      method: 'POST',
      token: 'my-token',
      body: { invite_code: 'EXAM24' },
    })

    expect(result).toEqual({ ok: true })
    expect(mockAxiosRequest).toHaveBeenCalledWith({
      url: '/groups/join',
      method: 'POST',
      headers: { Authorization: 'Bearer my-token' },
      data: { invite_code: 'EXAM24' },
    })
  })

  it('should append endpoint to the api path', async () => {
    mockAxiosRequest.mockResolvedValueOnce({ data: { deleted: true } })

    await apiRequest({
      api: 'quizzes',
      endpoint: '/42',
      method: 'DELETE',
      token: 't',
    })

    expect(mockAxiosRequest).toHaveBeenCalledWith(
      expect.objectContaining({ url: '/quizzes/42', method: 'DELETE' }),
    )
  })

  it('should pass through errors untransformed', async () => {
    const backendError = { response: { status: 401, data: { message: 'Nej' } } }
    mockAxiosRequest.mockRejectedValueOnce(backendError)

    await expect(apiRequest({ api: 'groups', token: 'bad' })).rejects.toBe(
      backendError,
    )
  })
})
