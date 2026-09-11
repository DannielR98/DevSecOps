import { describe, it, expect, beforeEach } from 'vitest'
import reducer, {
  setUsers,
  setUser,
  setUserById,
  setDeleteUser,
  setUpdateUser,
} from '../store/reduxSlice/userSlice/UserSlice'
import type { UserType } from '../utilities/interfaces'

const user1: UserType = {
  id: 1,
  auth0_id: 'auth0|1',
  firstname: 'Anna',
  surname: 'Andersson',
  username: 'anna',
  email: 'anna@example.com',
  password: 'secret',
}

const user2: UserType = {
  id: 2,
  auth0_id: 'auth0|2',
  firstname: 'Bo',
  surname: 'Bengtsson',
  username: 'bo',
  email: 'bo@example.com',
  password: 'secret',
}

const baseState = {
  users: [user1, user2],
  user: { userStoraged: null, token: null },
  userOne: null,
}

describe('UserSlice', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('should return initial state', () => {
    const state = reducer(undefined, { type: '@@INIT' })
    expect(state.users).toEqual([])
    expect(state.userOne).toBeNull()
  })

  it('setUsers replaces the user list', () => {
    const state = reducer(
      { ...baseState, users: [] },
      setUsers([user1, user2]),
    )
    expect(state.users).toHaveLength(2)
    expect(state.users[0].username).toBe('anna')
  })

  it('setUser finds user by auth0_id', () => {
    const state = reducer(baseState, setUser('auth0|2'))
    expect(state.userOne?.username).toBe('bo')
  })

  it('setUser keeps userOne when auth0_id is unknown', () => {
    const state = reducer(baseState, setUser('auth0|unknown'))
    expect(state.userOne).toBeNull()
  })

  it('setUserById finds user by database id', () => {
    const state = reducer(baseState, setUserById(1))
    expect(state.userOne?.email).toBe('anna@example.com')
  })

  it('setUserById keeps userOne when id is unknown', () => {
    const state = reducer(baseState, setUserById(999))
    expect(state.userOne).toBeNull()
  })

  it('setDeleteUser removes user by id', () => {
    const state = reducer(baseState, setDeleteUser(1))
    expect(state.users).toHaveLength(1)
    expect(state.users[0].id).toBe(2)
  })

  it('setDeleteUser with unknown id leaves list unchanged', () => {
    const state = reducer(baseState, setDeleteUser(999))
    expect(state.users).toHaveLength(2)
  })

  it('setUpdateUser replaces user in list', () => {
    const updated = { ...user1, username: 'anna-ny' }
    const state = reducer(
      baseState,
      setUpdateUser({ data: updated, id: 1 }),
    )
    expect(state.users[0].username).toBe('anna-ny')
    expect(state.users).toHaveLength(2)
  })

  it('setUpdateUser with unknown id leaves list unchanged', () => {
    const updated = { ...user1, username: 'anna-ny' }
    const state = reducer(
      baseState,
      setUpdateUser({ data: updated, id: 999 }),
    )
    expect(state.users).toEqual([user1, user2])
  })
})
