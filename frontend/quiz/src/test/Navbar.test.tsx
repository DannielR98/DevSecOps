import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Provider } from 'react-redux'
import { MemoryRouter } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { store } from '../store/store'

describe('Navbar Component', () => {
  it('should render app title', () => {
    render(
      <Provider store={store}>
        <MemoryRouter>
          <Navbar />
        </MemoryRouter>
      </Provider>,
    )
    expect(screen.getByText(/DevSecOps Quiz/i)).toBeInTheDocument()
  })
})
