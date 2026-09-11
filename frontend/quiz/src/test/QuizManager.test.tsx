import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import QuizManager from '../components/QuizManager'

describe('QuizManager Component', () => {
  it('should render quiz manager', () => {
    render(<QuizManager />)
    expect(screen.getByText(/Quiz|Skapa quiz/i)).toBeInTheDocument()
  })
})
