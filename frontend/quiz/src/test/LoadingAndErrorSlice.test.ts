import { describe, it, expect } from 'vitest'
import reducer, {
  setLoading,
  setError,
  setClearLoading,
  setFields,
  setSuccess,
} from '../store/reduxSlice/LoadingSlice/LoadingAndErrorSlice'

describe('LoadingAndErrorSlice', () => {
  it('should return initial state', () => {
    const state = reducer(undefined, { type: '@@INIT' })
    expect(state).toEqual({
      isLoading: false,
      error: null,
      fields: [],
      isSuccess: false,
    })
  })

  it('setLoading sets loading and clears error', () => {
    const withError = reducer(undefined, setError('Något gick fel'))
    const state = reducer(withError, setLoading())
    expect(state.isLoading).toBe(true)
    expect(state.error).toBeNull()
  })

  it('setError stores error message', () => {
    const state = reducer(undefined, setError('Något gick fel'))
    expect(state.error).toBe('Något gick fel')
  })

  it('setError accepts null to clear error', () => {
    const withError = reducer(undefined, setError('Fel'))
    const state = reducer(withError, setError(null))
    expect(state.error).toBeNull()
  })

  it('setClearLoading resets loading and error', () => {
    const loading = reducer(undefined, setLoading())
    const state = reducer(loading, setClearLoading())
    expect(state.isLoading).toBe(false)
    expect(state.error).toBeNull()
  })

  it('setFields replaces field list', () => {
    const state = reducer(undefined, setFields(['email', 'username']))
    expect(state.fields).toEqual(['email', 'username'])
  })

  it('setSuccess toggles success flag', () => {
    const on = reducer(undefined, setSuccess(true))
    expect(on.isSuccess).toBe(true)
    const off = reducer(on, setSuccess(false))
    expect(off.isSuccess).toBe(false)
  })
})
