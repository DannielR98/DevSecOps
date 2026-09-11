import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Provider } from 'react-redux'
import QuizManager from '../components/QuizManager'
import { store } from '../store/store'

describe('QuizManager Component', () => {
  it('should render quiz manager', () => {
    render(
      <Provider store={store}>
        <QuizManager />
      </Provider>,
    )
    expect(screen.getByText(/🎯 Quiz/i)).toBeInTheDocument()
  })
})
