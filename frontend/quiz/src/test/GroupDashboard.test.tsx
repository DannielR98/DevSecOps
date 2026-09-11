import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Provider } from 'react-redux'
import GroupDashboard from '../components/GroupDashboard'
import { store } from '../store/store'

describe('GroupDashboard Component', () => {
  it('should render group dashboard', () => {
    render(
      <Provider store={store}>
        <GroupDashboard />
      </Provider>,
    )
    expect(screen.getByRole('heading', { name: /Mina Quizgrupper/i })).toBeInTheDocument()
  })

  it('should have input for group name', () => {
    render(
      <Provider store={store}>
        <GroupDashboard />
      </Provider>,
    )
    const input = screen.getByPlaceholderText('Gruppnamn...')
    expect(input).toBeInTheDocument()
  })
})
