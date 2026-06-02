import { createRef } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { Button } from './Button'

describe('Button', () => {
  it('renders its children as a button', () => {
    render(<Button>Save</Button>)
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument()
  })

  it('shows a spinner and marks itself busy + disabled while loading', () => {
    render(<Button loading>Save</Button>)
    const button = screen.getByRole('button', { name: 'Save' })
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('aria-busy', 'true')
    // The Spinner renders an SVG; loading should add exactly one.
    expect(button.querySelector('svg')).toBeInTheDocument()
  })

  it('is disabled when disabled prop is set, with no spinner', () => {
    render(<Button disabled>Save</Button>)
    const button = screen.getByRole('button', { name: 'Save' })
    expect(button).toBeDisabled()
    expect(button.querySelector('svg')).not.toBeInTheDocument()
  })

  it('does not fire onClick while disabled or loading', async () => {
    const onClick = vi.fn()
    const user = userEvent.setup()

    const { rerender } = render(
      <Button disabled onClick={onClick}>
        Go
      </Button>,
    )
    await user.click(screen.getByRole('button', { name: 'Go' }))

    rerender(
      <Button loading onClick={onClick}>
        Go
      </Button>,
    )
    await user.click(screen.getByRole('button', { name: 'Go' }))

    expect(onClick).not.toHaveBeenCalled()
  })

  it('fires onClick when enabled', async () => {
    const onClick = vi.fn()
    const user = userEvent.setup()
    render(<Button onClick={onClick}>Go</Button>)

    await user.click(screen.getByRole('button', { name: 'Go' }))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('applies fullWidth styling when requested', () => {
    render(<Button fullWidth>Wide</Button>)
    expect(screen.getByRole('button', { name: 'Wide' })).toHaveClass('w-full')
  })

  it('forwards the ref to the underlying button element', () => {
    const ref = createRef<HTMLButtonElement>()
    render(<Button ref={ref}>Ref</Button>)
    expect(ref.current).toBeInstanceOf(HTMLButtonElement)
  })

  it('passes through native button attributes like type', () => {
    render(<Button type="submit">Submit</Button>)
    expect(screen.getByRole('button', { name: 'Submit' })).toHaveAttribute(
      'type',
      'submit',
    )
  })
})
