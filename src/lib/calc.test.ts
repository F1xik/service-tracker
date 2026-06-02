import { describe, expect, it } from 'vitest'

import { computeEarnings, computeTakeHome } from '@/lib/calc'

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

  it('rounds the half-cent boundary up for large amounts too', () => {
    // 1_000_000.5 * 1 / 100 = 10000.005 — a fixed Number.EPSILON nudge is too
    // small to correct float error at this magnitude.
    expect(computeEarnings(1_000_000.5, 1)).toBe(10_000.01)
  })

  it('matches the data-model invariant amount = price * pct / 100', () => {
    expect(computeEarnings(249.99, 15)).toBe(37.5)
  })

  it('returns the full price at 100% commission', () => {
    expect(computeEarnings(149.99, 100)).toBe(149.99)
    expect(computeEarnings(1000, 100)).toBe(1000)
  })

  it('handles commission above 100%', () => {
    expect(computeEarnings(100, 150)).toBe(150)
  })

  it('handles negative prices (refunds/adjustments) symmetrically', () => {
    // The epsilon nudge uses Math.sign so the boundary correction also works
    // for negative amounts — mirror image of the 100.5 * 1% case.
    expect(computeEarnings(-100, 20)).toBe(-20)
    expect(computeEarnings(-100.5, 1)).toBe(-1.01)
  })

  it('rounds a sub-half-cent fraction down', () => {
    // 100 * 0.4% = 0.40 exactly; nudging must not push it to 0.41.
    expect(computeEarnings(100, 0.4)).toBe(0.4)
    // 100.4 * 1% = 1.004 -> 1.00
    expect(computeEarnings(100.4, 1)).toBe(1)
  })

  it('always returns a value rounded to at most two decimals', () => {
    for (const [price, pct] of [
      [199.99, 12.5],
      [33.33, 7],
      [9876.54, 3.21],
    ] as const) {
      const result = computeEarnings(price, pct)
      // No more than two decimal places of precision should survive.
      expect(Math.round(result * 100) / 100).toBe(result)
    }
  })

  it('treats commission as a percentage, not a fraction', () => {
    // A 1 here means 1%, not 100% — guards against a /100 regression.
    expect(computeEarnings(100, 1)).toBe(1)
  })
})

describe('computeTakeHome', () => {
  it('adds the tip on top of earnings (no commission on tips)', () => {
    expect(computeTakeHome(6, 4)).toBe(10)
    expect(computeTakeHome(37.5, 12.5)).toBe(50)
  })

  it('returns earnings unchanged when the tip is zero', () => {
    expect(computeTakeHome(6, 0)).toBe(6)
  })

  it('cleans up float noise to two decimal places', () => {
    // 0.1 + 0.2 = 0.30000000000000004 in float; must collapse to 0.3.
    expect(computeTakeHome(0.1, 0.2)).toBe(0.3)
  })

  it('handles negative earnings (refunds) plus a tip', () => {
    expect(computeTakeHome(-20, 5)).toBe(-15)
  })
})
