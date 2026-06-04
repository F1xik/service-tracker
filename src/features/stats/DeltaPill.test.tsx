import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { DeltaPill } from './DeltaPill'

describe('DeltaPill', () => {
  it('renders nothing when there is no baseline', () => {
    const { container } = render(<DeltaPill value={null} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('shows an up arrow and positive label for a rise', () => {
    render(<DeltaPill value={12.4} />)
    const pill = screen.getByText(/12%/)
    expect(pill).toHaveTextContent('▲')
    expect(pill).toHaveAccessibleName(/up 12% vs previous period/i)
  })

  it('shows a down arrow and the absolute magnitude for a fall', () => {
    render(<DeltaPill value={-8.6} />)
    // Rounds to 9 and drops the sign in the visible label.
    const pill = screen.getByText(/9%/)
    expect(pill).toHaveTextContent('▼')
    expect(pill).toHaveAccessibleName(/down 9% vs previous period/i)
  })

  it('shows a neutral pill for no change', () => {
    render(<DeltaPill value={0} />)
    const pill = screen.getByText(/0%/)
    expect(pill).toHaveTextContent('→')
    expect(pill).toHaveAccessibleName(/no change vs previous period/i)
  })
})
