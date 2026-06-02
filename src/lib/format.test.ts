import { describe, expect, it } from 'vitest'

import { formatPrice } from './format'

describe('formatPrice', () => {
  it('formats a value with the given currency', () => {
    // Locale-dependent grouping, so assert the parts that are stable.
    const result = formatPrice(40, 'USD')
    expect(result).toContain('40')
  })

  it('includes two decimal places for fractional amounts', () => {
    expect(formatPrice(6.5, 'USD')).toContain('6.50')
  })

  it('falls back to a plain fixed string for an invalid currency code', () => {
    expect(formatPrice(12.3, 'not-a-currency')).toBe('12.30')
  })
})
