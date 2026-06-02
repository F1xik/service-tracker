import { createRef } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { Input } from './Input'

describe('Input', () => {
  it('renders a text input and accepts typing', async () => {
    const user = userEvent.setup()
    render(<Input aria-label="name" />)

    const input = screen.getByLabelText('name')
    await user.type(input, 'hello')
    expect(input).toHaveValue('hello')
  })

  it('sets aria-invalid when error is true', () => {
    render(<Input aria-label="email" error />)
    expect(screen.getByLabelText('email')).toHaveAttribute('aria-invalid', 'true')
  })

  it('omits aria-invalid when there is no error', () => {
    render(<Input aria-label="email" />)
    expect(screen.getByLabelText('email')).not.toHaveAttribute('aria-invalid')
  })

  it('forwards native props such as type and placeholder', () => {
    render(<Input type="password" placeholder="secret" aria-label="pw" />)
    const input = screen.getByLabelText('pw')
    expect(input).toHaveAttribute('type', 'password')
    expect(input).toHaveAttribute('placeholder', 'secret')
  })

  it('forwards the ref to the input element', () => {
    const ref = createRef<HTMLInputElement>()
    render(<Input ref={ref} aria-label="ref" />)
    expect(ref.current).toBeInstanceOf(HTMLInputElement)
  })
})
