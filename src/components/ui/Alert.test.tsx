import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Alert } from './Alert'

describe('Alert', () => {
  it('renders its children inside an alert role', () => {
    render(<Alert>Heads up</Alert>)
    expect(screen.getByRole('alert')).toHaveTextContent('Heads up')
  })

  it('uses the info variant styling by default', () => {
    render(<Alert>Default</Alert>)
    expect(screen.getByRole('alert')).toHaveClass('text-[var(--color-info)]')
  })

  it('applies error variant styling', () => {
    render(<Alert variant="error">Oops</Alert>)
    expect(screen.getByRole('alert')).toHaveClass('text-[var(--color-negative)]')
  })

  it('applies success variant styling', () => {
    render(<Alert variant="success">Done</Alert>)
    expect(screen.getByRole('alert')).toHaveClass('text-[var(--color-positive)]')
  })

  it('merges an extra className without dropping base styling', () => {
    render(<Alert className="mt-4">Spaced</Alert>)
    const alert = screen.getByRole('alert')
    expect(alert).toHaveClass('mt-4')
    expect(alert).toHaveClass('rounded-[var(--radius-md)]')
  })
})
