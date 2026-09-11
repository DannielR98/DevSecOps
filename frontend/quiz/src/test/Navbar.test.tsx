import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import Navbar from '../components/Navbar'

describe('Navbar Component', () => {
  it('should render app title', () => {
    render(<Navbar />)
    expect(screen.getByText(/DevSecOps Quiz/i)).toBeInTheDocument()
  })
})
