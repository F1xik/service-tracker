import { beforeEach, describe, expect, it, vi } from 'vitest'

import { computeEarnings } from '@/lib/calc'

const getUser = vi.hoisted(() => vi.fn())
const from = vi.hoisted(() => vi.fn())

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: { getUser },
    from,
  },
}))

import { createEntries, deleteEntry, getEntries } from './api'

beforeEach(() => {
  vi.clearAllMocks()
  getUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })
})

describe('createEntries', () => {
  it('inserts an array of rows with computed amount_earned and shared header', async () => {
    const insert = vi.fn().mockReturnValue({
      select: vi.fn().mockResolvedValue({ data: [{ id: 'e1' }], error: null }),
    })
    from.mockReturnValue({ insert })

    await createEntries({
      provided_on: '2026-06-02',
      customer: 'Jane',
      note: null,
      commissionPct: 15,
      lines: [
        { service_id: 's1', price: 40 },
        { service_id: 's2', price: 60 },
      ],
    })

    expect(from).toHaveBeenCalledWith('income_entries')
    const rows = insert.mock.calls[0][0]
    expect(Array.isArray(rows)).toBe(true)
    expect(rows).toHaveLength(2)
    expect(rows[0]).toMatchObject({
      user_id: 'u1',
      service_id: 's1',
      provided_on: '2026-06-02',
      price_snapshot: 40,
      commission_pct_snapshot: 15,
      amount_earned: computeEarnings(40, 15),
      customer: 'Jane',
      note: null,
    })
    expect(rows[1].amount_earned).toBe(computeEarnings(60, 15))
  })

  it('throws when no user is signed in', async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null })
    await expect(
      createEntries({
        provided_on: '2026-06-02',
        customer: null,
        note: null,
        commissionPct: 10,
        lines: [{ service_id: 's1', price: 10 }],
      }),
    ).rejects.toThrow(/signed in/)
  })

  it('propagates an insert error (all-or-nothing surfaces as a throw)', async () => {
    const insert = vi.fn().mockReturnValue({
      select: vi
        .fn()
        .mockResolvedValue({ data: null, error: new Error('trigger rejected') }),
    })
    from.mockReturnValue({ insert })

    await expect(
      createEntries({
        provided_on: '2026-06-02',
        customer: null,
        note: null,
        commissionPct: 10,
        lines: [{ service_id: 's1', price: 10 }],
      }),
    ).rejects.toThrow('trigger rejected')
  })
})

describe('getEntries', () => {
  it('selects entries with the embedded service name, ordered and limited', async () => {
    const limit = vi.fn().mockResolvedValue({ data: [{ id: 'e1' }], error: null })
    const order2 = vi.fn().mockReturnValue({ limit })
    const order1 = vi.fn().mockReturnValue({ order: order2 })
    const select = vi.fn().mockReturnValue({ order: order1 })
    from.mockReturnValue({ select })

    const result = await getEntries(20)

    expect(from).toHaveBeenCalledWith('income_entries')
    expect(select).toHaveBeenCalledWith('*, service:services(name)')
    expect(order1).toHaveBeenCalledWith('provided_on', { ascending: false })
    expect(order2).toHaveBeenCalledWith('created_at', { ascending: false })
    expect(limit).toHaveBeenCalledWith(20)
    expect(result).toEqual([{ id: 'e1' }])
  })
})

describe('deleteEntry', () => {
  it('deletes by id', async () => {
    const eq = vi.fn().mockResolvedValue({ error: null })
    const del = vi.fn().mockReturnValue({ eq })
    from.mockReturnValue({ delete: del })

    await deleteEntry('e1')

    expect(from).toHaveBeenCalledWith('income_entries')
    expect(eq).toHaveBeenCalledWith('id', 'e1')
  })
})
