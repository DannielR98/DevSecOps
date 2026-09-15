import { describe, it, expect, beforeEach } from 'vitest'
import reducer, {
  setAuth,
  loadAuth,
  clearAuth,
} from '../store/reduxSlice/userSlice/authSlice'

const authUser = {
  sub: 'auth0|test-user',
  email: 'test@example.com',
  name: 'Test User',
  nickname: 'tester',
  picture: 'https://example.com/avatar.png',
}

describe('authSlice', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('should return initial state', () => {
    const state = reducer(undefined, { type: '@@INIT' })
    expect(state).toEqual({ isAuth: false, token: null, userStorage: null })
  })

  it('setAuth stores auth and persists to localStorage', () => {
    const state = reducer(
      undefined,
      setAuth({ isAuth: true, token: 'abc123', userStorage: authUser }),
    )
    expect(state.isAuth).toBe(true)
    expect(state.token).toBe('abc123')
    expect(state.userStorage).toEqual(authUser)

    const stored = JSON.parse(localStorage.getItem('storedUser') ?? '{}')
    expect(stored.token).toBe('abc123')
    expect(stored.user).toEqual(authUser)
  })

  it('loadAuth restores auth from localStorage', () => {
    localStorage.setItem(
      'storedUser',
      JSON.stringify({ token: 'saved-token', user: authUser }),
    )
    const state = reducer(undefined, loadAuth())
    expect(state.isAuth).toBe(true)
    expect(state.token).toBe('saved-token')
    expect(state.userStorage).toEqual(authUser)
  })

  it('loadAuth does nothing when nothing is stored', () => {
    const state = reducer(undefined, loadAuth())
    expect(state.isAuth).toBe(false)
    expect(state.token).toBeNull()
  })

  it('loadAuth clears corrupt localStorage entry', () => {
    localStorage.setItem('storedUser', 'not-json{{{')
    const state = reducer(undefined, loadAuth())
    expect(state.isAuth).toBe(false)
    expect(localStorage.getItem('storedUser')).toBeNull()
  })

  it('clearAuth resets state and removes localStorage entry', () => {
    const loggedIn = reducer(
      undefined,
      setAuth({ isAuth: true, token: 'abc123', userStorage: authUser }),
    )
    expect(loggedIn.isAuth).toBe(true)

    const cleared = reducer(loggedIn, clearAuth())
    expect(cleared).toEqual({ isAuth: false, token: null, userStorage: null })
    expect(localStorage.getItem('storedUser')).toBeNull()
  })
})
