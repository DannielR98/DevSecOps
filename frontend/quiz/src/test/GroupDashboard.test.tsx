import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import GroupDashboard from '../components/GroupDashboard'

describe('GroupDashboard Component', () => {
  it('should render group dashboard', () => {
    render(<GroupDashboard />)
    expect(screen.getByText(/Grupper|Dina Grupper|Groups/i)).toBeInTheDocument()
  })

  it('should have input for group name', () => {
    render(<GroupDashboard />)
    const input = screen.getByPlaceholderText(/Gruppnamn|Gruppens namn|Namn/i)
    expect(input).toBeInTheDocument()
  })
})
