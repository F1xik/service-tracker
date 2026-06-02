import { beforeEach, describe, expect, it, vi } from 'vitest'

import { computeEarnings } from '@/lib/calc'

const rpc = vi.hoisted(() => vi.fn())
const from = vi.hoisted(() => vi.fn())

vi.mock('@/lib/supabase', () => ({
  supabase: {
    rpc,
    from,
  },
}))

import {
  createAppointment,
  deleteAppointment,
  getAppointments,
  getAllAppointments,
} from './api'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('createAppointment', () => {
  it('calls the create_appointment RPC with client-computed amount_earned', async () => {
    rpc.mockResolvedValue({ data: { id: 'a1' }, error: null })

    const result = await createAppointment({
      provided_on: '2026-06-02',
      customer: 'Jane',
      note: null,
      tip: 5,
      commissionPct: 15,
      lines: [
        { service_id: 's1', price: 40 },
        { service_id: 's2', price: 60 },
      ],
    })

    expect(rpc).toHaveBeenCalledWith('create_appointment', {
      p_provided_on: '2026-06-02',
      p_customer: 'Jane',
      p_note: null,
      p_tip: 5,
      p_lines: [
        {
          service_id: 's1',
          price_snapshot: 40,
          commission_pct_snapshot: 15,
          amount_earned: computeEarnings(40, 15),
        },
        {
          service_id: 's2',
          price_snapshot: 60,
          commission_pct_snapshot: 15,
          amount_earned: computeEarnings(60, 15),
        },
      ],
    })
    expect(result).toEqual({ id: 'a1' })
  })

  it('propagates an RPC error (all-or-nothing surfaces as a throw)', async () => {
    rpc.mockResolvedValue({ data: null, error: new Error('trigger rejected') })

    await expect(
      createAppointment({
        provided_on: '2026-06-02',
        customer: null,
        note: null,
        tip: 0,
        commissionPct: 10,
        lines: [{ service_id: 's1', price: 10 }],
      }),
    ).rejects.toThrow('trigger rejected')
  })
})

describe('getAppointments', () => {
  it('selects appointments with embedded line items, ordered and limited', async () => {
    const limit = vi.fn().mockResolvedValue({ data: [{ id: 'a1' }], error: null })
    const order2 = vi.fn().mockReturnValue({ limit })
    const order1 = vi.fn().mockReturnValue({ order: order2 })
    const select = vi.fn().mockReturnValue({ order: order1 })
    from.mockReturnValue({ select })

    const result = await getAppointments(20)

    expect(from).toHaveBeenCalledWith('appointments')
    expect(select).toHaveBeenCalledWith(
      '*, entries:income_entries(*, service:services(name))',
    )
    expect(order1).toHaveBeenCalledWith('provided_on', { ascending: false })
    expect(order2).toHaveBeenCalledWith('created_at', { ascending: false })
    expect(limit).toHaveBeenCalledWith(20)
    expect(result).toEqual([{ id: 'a1' }])
  })
})

describe('getAllAppointments', () => {
  it('selects every appointment oldest first with embedded line items', async () => {
    const order = vi.fn().mockResolvedValue({ data: [{ id: 'a1' }], error: null })
    const select = vi.fn().mockReturnValue({ order })
    from.mockReturnValue({ select })

    const result = await getAllAppointments()

    expect(from).toHaveBeenCalledWith('appointments')
    expect(select).toHaveBeenCalledWith(
      '*, entries:income_entries(*, service:services(name))',
    )
    expect(order).toHaveBeenCalledWith('provided_on', { ascending: true })
    expect(result).toEqual([{ id: 'a1' }])
  })
})

describe('deleteAppointment', () => {
  it('deletes by id (line items cascade away)', async () => {
    const eq = vi.fn().mockResolvedValue({ error: null })
    const del = vi.fn().mockReturnValue({ eq })
    from.mockReturnValue({ delete: del })

    await deleteAppointment('a1')

    expect(from).toHaveBeenCalledWith('appointments')
    expect(eq).toHaveBeenCalledWith('id', 'a1')
  })
})
