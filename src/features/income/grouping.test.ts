import { describe, expect, it } from 'vitest'

import { appointmentTakeHome, groupAppointmentsByDate } from './grouping'
import type { AppointmentWithEntries } from './api'

function appointment(
  overrides: Partial<AppointmentWithEntries> = {},
): AppointmentWithEntries {
  return {
    id: 'a1',
    user_id: 'u1',
    provided_on: '2026-06-02',
    customer: null,
    note: null,
    tip: 0,
    source: 'manual',
    created_at: '2026-06-02T00:00:00Z',
    entries: [
      {
        id: 'e1',
        user_id: 'u1',
        appointment_id: 'a1',
        service_id: 's1',
        price_snapshot: 40,
        commission_pct_snapshot: 15,
        amount_earned: 6,
        created_at: '2026-06-02T00:00:00Z',
        service: { name: 'Haircut' },
      },
    ],
    ...overrides,
  }
}

describe('appointmentTakeHome', () => {
  it('sums line earnings and adds the tip', () => {
    const a = appointment({
      tip: 4,
      entries: [
        { ...appointment().entries[0], id: 'e1', amount_earned: 6 },
        { ...appointment().entries[0], id: 'e2', amount_earned: 3.5 },
      ],
    })
    expect(appointmentTakeHome(a)).toBe(13.5)
  })
})

describe('groupAppointmentsByDate', () => {
  it('returns an empty array for no appointments', () => {
    expect(groupAppointmentsByDate([])).toEqual([])
  })

  it('collapses appointments sharing a date into a single group', () => {
    const groups = groupAppointmentsByDate([
      appointment({ id: 'a1', provided_on: '2026-06-02' }),
      appointment({ id: 'a2', provided_on: '2026-06-02' }),
    ])
    expect(groups).toHaveLength(1)
    expect(groups[0].date).toBe('2026-06-02')
    expect(groups[0].appointments.map((a) => a.id)).toEqual(['a1', 'a2'])
  })

  it('keeps distinct dates as separate groups in input order', () => {
    const groups = groupAppointmentsByDate([
      appointment({ id: 'a1', provided_on: '2026-06-03' }),
      appointment({ id: 'a2', provided_on: '2026-06-02' }),
    ])
    expect(groups.map((g) => g.date)).toEqual(['2026-06-03', '2026-06-02'])
  })

  it('sums each day total from per-appointment take-home, including tips', () => {
    const groups = groupAppointmentsByDate([
      appointment({ id: 'a1', provided_on: '2026-06-02', tip: 4 }), // 6 + 4 = 10
      appointment({ id: 'a2', provided_on: '2026-06-02', tip: 0 }), // 6
    ])
    expect(groups).toHaveLength(1)
    expect(groups[0].total).toBe(16)
  })
})
