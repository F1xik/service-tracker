import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { ChartTooltip } from './ChartTooltip'

const payload = [{ value: 1494.2, name: 'Haircut' }] as never

describe('ChartTooltip', () => {
  it('renders nothing when inactive', () => {
    const { container } = render(
      <ChartTooltip
        active={false}
        payload={payload}
        label="Apr '26"
        formatValue={String}
      />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('renders nothing when the payload is empty', () => {
    const { container } = render(
      <ChartTooltip
        active
        payload={[] as never}
        label="Apr '26"
        formatValue={String}
      />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('shows the axis label heading and the formatted value (bar chart)', () => {
    render(
      <ChartTooltip
        active
        payload={payload}
        label="Apr '26"
        formatValue={(v) => `${v} PLN`}
      />,
    )
    expect(screen.getByText("Apr '26")).toBeInTheDocument()
    expect(screen.getByText('1494.2 PLN')).toBeInTheDocument()
  })

  it('uses the payload name as heading for the pie chart', () => {
    render(
      <ChartTooltip
        active
        labelFromPayload
        payload={payload}
        label="ignored"
        formatValue={(v) => `${v} PLN`}
      />,
    )
    // Heading comes from the slice name, not the (absent) axis label.
    expect(screen.getByText('Haircut')).toBeInTheDocument()
    expect(screen.queryByText('ignored')).not.toBeInTheDocument()
    expect(screen.getByText('1494.2 PLN')).toBeInTheDocument()
  })
})
