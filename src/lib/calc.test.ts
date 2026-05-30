import { describe, expect, it } from 'vitest'

import { computeEarnings } from '@/lib/calc'

describe('computeEarnings', () => {
  it('applies the commission percentage', () => {
    expect(computeEarnings(100, 20)).toBe(20)
    expect(computeEarnings(50, 10)).toBe(5)
  })

  it('returns 0 for a 0% commission', () => {
    expect(computeEarnings(100, 0)).toBe(0)
  })

  it('returns 0 for a 0 price', () => {
    expect(computeEarnings(0, 25)).toBe(0)
  })

  it('rounds to two decimal places', () => {
    // 33.333... -> 33.33
    expect(computeEarnings(100, 33.333)).toBe(33.33)
  })

  it('rounds the half-cent boundary up despite float error', () => {
    // price * pct/100 = 1.005, which float-multiplies to 100.49999…
    expect(computeEarnings(100.5, 1)).toBe(1.01)
  })

  it('matches the data-model invariant amount = price * pct / 100', () => {
    const price = 249.99
    const pct = 15
    expect(computeEarnings(price, pct)).toBe(
      Math.round((price * (pct / 100) + Number.EPSILON) * 100) / 100,
    )
  })
})
