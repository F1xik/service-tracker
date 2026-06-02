import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { ServiceForm } from './ServiceForm'

describe('ServiceForm', () => {
  it('rejects an empty name and a non-positive price', async () => {
    const onSubmit = vi.fn()
    const user = userEvent.setup()
    render(<ServiceForm onSubmit={onSubmit} onCancel={() => {}} />)

    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByText('Name is required')).toBeInTheDocument()
    expect(screen.getByText('Price must be greater than 0')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('rejects a price of zero', async () => {
    const onSubmit = vi.fn()
    const user = userEvent.setup()
    render(<ServiceForm onSubmit={onSubmit} onCancel={() => {}} />)

    await user.type(screen.getByLabelText(/Name/), 'Haircut')
    await user.type(screen.getByLabelText(/Price/), '0')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByText('Price must be greater than 0')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('submits a parsed numeric price on valid input', async () => {
    const onSubmit = vi.fn()
    const user = userEvent.setup()
    render(<ServiceForm onSubmit={onSubmit} onCancel={() => {}} />)

    await user.type(screen.getByLabelText(/Name/), 'Haircut')
    await user.type(screen.getByLabelText(/Price/), '40.50')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(onSubmit).toHaveBeenCalled())
    expect(onSubmit.mock.calls[0][0]).toEqual({ name: 'Haircut', price: 40.5 })
  })

  it('pre-fills values when editing', () => {
    render(
      <ServiceForm
        defaultValues={{ name: 'Massage', price: 90 }}
        onSubmit={() => {}}
        onCancel={() => {}}
      />,
    )
    expect(screen.getByLabelText(/Name/)).toHaveValue('Massage')
    expect(screen.getByLabelText(/Price/)).toHaveValue(90)
  })

  it('calls onCancel when Cancel is clicked', async () => {
    const onCancel = vi.fn()
    const user = userEvent.setup()
    render(<ServiceForm onSubmit={() => {}} onCancel={onCancel} />)

    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onCancel).toHaveBeenCalled()
  })
})
