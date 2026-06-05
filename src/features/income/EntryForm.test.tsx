import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Service } from '@/lib/calc'

import { EntryForm } from './EntryForm'

function service(overrides: Partial<Service> = {}): Service {
  return {
    id: 's1',
    user_id: 'u1',
    name: 'Haircut',
    price: 40,
    active: true,
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

const services = [
  service({ id: 's1', name: 'Haircut', price: 40 }),
  service({ id: 's2', name: 'Hair styling', price: 60 }),
]

const onSubmit = vi.fn()

function setup(props: Partial<Parameters<typeof EntryForm>[0]> = {}) {
  return render(
    <EntryForm
      activeServices={services}
      commissionPct={15}
      currency="USD"
      onSubmit={onSubmit}
      {...props}
    />,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('EntryForm', () => {
  it('renders a single line item by default with today as the date', () => {
    setup()
    expect(screen.getByLabelText(/Service/)).toBeInTheDocument()

    const now = new Date()
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
      now.getDate(),
    ).padStart(2, '0')}`
    expect(screen.getByLabelText(/Date/)).toHaveValue(today)
  })

  it('prefills the price when a service is selected', async () => {
    const user = userEvent.setup()
    setup()

    await user.selectOptions(screen.getByLabelText(/Service/), 's1')
    expect(screen.getByLabelText(/Price/)).toHaveValue(40)
  })

  it('shows the per-line earnings using computeEarnings', async () => {
    const user = userEvent.setup()
    setup()

    await user.selectOptions(screen.getByLabelText(/Service/), 's1')
    // 40 * 15% = 6.00
    await waitFor(() =>
      expect(screen.getAllByText(/\$6\.00/).length).toBeGreaterThan(0),
    )
  })

  it('blocks submit and shows an error when no service is picked', async () => {
    const user = userEvent.setup()
    setup()

    await user.click(screen.getByRole('button', { name: 'Log income' }))

    expect(await screen.findByText('Pick a service')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('rejects a non-positive price', async () => {
    const user = userEvent.setup()
    setup()

    await user.selectOptions(screen.getByLabelText(/Service/), 's1')
    const price = screen.getByLabelText(/Price/)
    await user.clear(price)
    await user.type(price, '0')
    await user.click(screen.getByRole('button', { name: 'Log income' }))

    expect(await screen.findByText('Price must be greater than 0')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('adds and removes line items', async () => {
    const user = userEvent.setup()
    setup()

    expect(screen.getAllByLabelText(/Service/)).toHaveLength(1)

    await user.click(screen.getByRole('button', { name: 'Add service' }))
    expect(screen.getAllByLabelText(/Service/)).toHaveLength(2)

    await user.click(screen.getByRole('button', { name: 'Remove service 2' }))
    expect(screen.getAllByLabelText(/Service/)).toHaveLength(1)
  })

  it('submits a multi-line batch with the shared header and numeric prices', async () => {
    const user = userEvent.setup()
    setup()

    await user.selectOptions(screen.getByLabelText(/Service/), 's1')
    await user.click(screen.getByRole('button', { name: 'Add service' }))

    const selects = screen.getAllByLabelText(/Service/)
    await user.selectOptions(selects[1], 's2')
    await user.type(screen.getByLabelText(/Customer/), 'Jane')

    await user.click(screen.getByRole('button', { name: 'Log income' }))

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    const values = onSubmit.mock.calls[0][0]
    expect(values.customer).toBe('Jane')
    expect(values.lines).toEqual([
      { service_id: 's1', price: 40 },
      { service_id: 's2', price: 60 },
    ])
  })

  it('renders an empty tip field', () => {
    setup()
    expect(screen.getByLabelText(/Tip/)).toHaveValue(null)
  })

  it('adds the tip on top of earnings in the total (no commission on tips)', async () => {
    const user = userEvent.setup()
    setup()

    await user.selectOptions(screen.getByLabelText(/Service/), 's1')
    // 40 * 15% = 6.00 earned; tip of 4 → take-home 10.00.
    await user.clear(screen.getByLabelText(/Tip/))
    await user.type(screen.getByLabelText(/Tip/), '4')

    await waitFor(() => expect(screen.getByText(/\$10\.00/)).toBeInTheDocument())
  })

  it('rejects a negative tip', async () => {
    const user = userEvent.setup()
    setup()

    await user.selectOptions(screen.getByLabelText(/Service/), 's1')
    const tip = screen.getByLabelText(/Tip/)
    await user.clear(tip)
    await user.type(tip, '-5')
    await user.click(screen.getByRole('button', { name: 'Log income' }))

    expect(await screen.findByText('Tip cannot be negative')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('includes the tip in the submitted values', async () => {
    const user = userEvent.setup()
    setup()

    await user.selectOptions(screen.getByLabelText(/Service/), 's1')
    await user.clear(screen.getByLabelText(/Tip/))
    await user.type(screen.getByLabelText(/Tip/), '7')
    await user.click(screen.getByRole('button', { name: 'Log income' }))

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit.mock.calls[0][0].tip).toBe(7)
  })

  describe('edit mode', () => {
    const initialValues = {
      provided_on: '2026-06-02',
      customer: 'Jane',
      note: '',
      tip: 4,
      commission: 15,
      lines: [{ service_id: 's1', price: 40 }],
    }

    it('prefills the form and shows an editable commission field', () => {
      setup({
        initialValues,
        showCommission: true,
        submitLabel: 'Save changes',
      })

      expect(screen.getByLabelText(/Customer/)).toHaveValue('Jane')
      expect(screen.getByLabelText(/Commission/)).toHaveValue(15)
      expect(screen.getByLabelText(/Price/)).toHaveValue(40)
      expect(screen.getByRole('button', { name: 'Save changes' })).toBeInTheDocument()
    })

    it('recomputes the earnings preview when commission changes', async () => {
      const user = userEvent.setup()
      setup({ initialValues, showCommission: true, submitLabel: 'Save changes' })

      // 40 * 15% = 6.00 at first.
      expect(screen.getAllByText(/\$6\.00/).length).toBeGreaterThan(0)

      const commission = screen.getByLabelText(/Commission/)
      await user.clear(commission)
      await user.type(commission, '25')

      // 40 * 25% = 10.00 once the commission is edited.
      await waitFor(() =>
        expect(screen.getAllByText(/\$10\.00/).length).toBeGreaterThan(0),
      )
    })

    it('submits the edited commission value', async () => {
      const user = userEvent.setup()
      setup({ initialValues, showCommission: true, submitLabel: 'Save changes' })

      const commission = screen.getByLabelText(/Commission/)
      await user.clear(commission)
      await user.type(commission, '25')
      await user.click(screen.getByRole('button', { name: 'Save changes' }))

      await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
      expect(onSubmit.mock.calls[0][0].commission).toBe(25)
    })
  })
})
