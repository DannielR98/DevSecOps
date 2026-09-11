import { render, type RenderOptions } from '@testing-library/react'
import type { ReactElement } from 'react'
import { Provider } from 'react-redux'
import { MemoryRouter } from 'react-router-dom'
import { configureStore } from '@reduxjs/toolkit'
import userSliceReducer from '../store/reduxSlice/userSlice/UserSlice'
import authSliceReducer from '../store/reduxSlice/userSlice/authSlice'
import loadingSliceReducer from '../store/reduxSlice/LoadingSlice/LoadingAndErrorSlice'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function makeTestStore(preloadedState?: any) {
  return configureStore({
    reducer: {
      userSlice: userSliceReducer,
      authSlice: authSliceReducer,
      loadingSlice: loadingSliceReducer,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any,
    preloadedState,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any) as any
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type TestStore = any

interface ExtendedRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  preloadedState?: any
  store?: TestStore
  route?: string
}

export function renderWithProviders(
  ui: ReactElement,
  {
    preloadedState,
    store = makeTestStore(preloadedState),
    route = '/',
    ...renderOptions
  }: ExtendedRenderOptions = {},
) {
  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <Provider store={store}>
        <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
      </Provider>
    )
  }
  return { store, ...render(ui, { wrapper: Wrapper, ...renderOptions }) }
}
