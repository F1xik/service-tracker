import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Field } from './Field'

describe('Field', () => {
  it('associates the label with the control via htmlFor', () => {
    render(
      <Field id="email" label="Email">
        <input id="email" />
      </Field>,
    )
    // getByLabelText resolves the label -> control association.
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
  })

  it('marks required fields with an asterisk', () => {
    render(
      <Field id="email" label="Email" required>
        <input id="email" />
      </Field>,
    )
    expect(screen.getByText('*', { exact: false })).toBeInTheDocument()
  })

  it('omits the asterisk when not required', () => {
    render(
      <Field id="name" label="Name">
        <input id="name" />
      </Field>,
    )
    expect(screen.queryByText('*', { exact: false })).not.toBeInTheDocument()
  })

  it('renders the error message with an alert role and the error id', () => {
    render(
      <Field id="email" label="Email" error="Required">
        <input id="email" />
      </Field>,
    )
    const error = screen.getByRole('alert')
    expect(error).toHaveTextContent('Required')
    expect(error).toHaveAttribute('id', 'email-error')
  })

  it('shows the helper text when there is no error', () => {
    render(
      <Field id="email" label="Email" helper="We never share it">
        <input id="email" />
      </Field>,
    )
    const helper = screen.getByText('We never share it')
    expect(helper).toHaveAttribute('id', 'email-helper')
  })

  it('prefers the error over the helper when both are provided', () => {
    render(
      <Field id="email" label="Email" error="Bad email" helper="We never share it">
        <input id="email" />
      </Field>,
    )
    expect(screen.getByText('Bad email')).toBeInTheDocument()
    expect(screen.queryByText('We never share it')).not.toBeInTheDocument()
  })
})
