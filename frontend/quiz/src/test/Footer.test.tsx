import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import Footer from '../utilities/commonSection/Footer'

describe('Footer', () => {
  it('should render copyright text', () => {
    render(<Footer />)
    expect(
      screen.getByText(/© 2026 QuizApp. Alla rättigheter förbehållna./i),
    ).toBeInTheDocument()
  })

  it('should render a footer landmark', () => {
    render(<Footer />)
    expect(screen.getByRole('contentinfo')).toBeInTheDocument()
  })
})
