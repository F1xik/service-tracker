import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { Switch } from './Switch'

describe('Switch', () => {
  it('reflects the checked state via aria-checked', () => {
    render(<Switch checked onCheckedChange={() => {}} label="Active" />)
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true')
  })

  it('reflects the unchecked state via aria-checked', () => {
    render(<Switch checked={false} onCheckedChange={() => {}} label="Active" />)
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'false')
  })

  it('calls onCheckedChange with the toggled value on click', async () => {
    const onCheckedChange = vi.fn()
    const user = userEvent.setup()
    render(<Switch checked={false} onCheckedChange={onCheckedChange} label="Active" />)

    await user.click(screen.getByRole('switch'))
    expect(onCheckedChange).toHaveBeenCalledWith(true)
  })

  it('does not fire when disabled', async () => {
    const onCheckedChange = vi.fn()
    const user = userEvent.setup()
    render(<Switch checked onCheckedChange={onCheckedChange} label="Active" disabled />)

    await user.click(screen.getByRole('switch'))
    expect(onCheckedChange).not.toHaveBeenCalled()
  })
})
