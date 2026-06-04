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
  DAY_FETCH_SIZE,
  getAppointmentDayCount,
  getAppointmentsDayPage,
  getAllAppointments,
  updateAppointment,
} from './api'

/** Build N appointments on `date` with distinct ids (newest-first order). */
function daySpread(date: string, n: number) {
  return Array.from({ length: n }, (_, i) => ({
    id: `${date}-${i}`,
    provided_on: date,
  }))
}

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

describe('updateAppointment', () => {
  it('calls the update_appointment RPC with p_id and recomputed amount_earned', async () => {
    rpc.mockResolvedValue({ data: { id: 'a1' }, error: null })

    const result = await updateAppointment({
      id: 'a1',
      provided_on: '2026-06-02',
      customer: 'Jane',
      note: null,
      tip: 5,
      commissionPct: 20,
      lines: [{ service_id: 's1', price: 40 }],
    })

    expect(rpc).toHaveBeenCalledWith('update_appointment', {
      p_id: 'a1',
      p_provided_on: '2026-06-02',
      p_customer: 'Jane',
      p_note: null,
      p_tip: 5,
      p_lines: [
        {
          service_id: 's1',
          price_snapshot: 40,
          commission_pct_snapshot: 20,
          amount_earned: computeEarnings(40, 20),
        },
      ],
    })
    expect(result).toEqual({ id: 'a1' })
  })

  it('propagates an RPC error', async () => {
    rpc.mockResolvedValue({ data: null, error: new Error('not found') })

    await expect(
      updateAppointment({
        id: 'missing',
        provided_on: '2026-06-02',
        customer: null,
        note: null,
        tip: 0,
        commissionPct: 10,
        lines: [{ service_id: 's1', price: 10 }],
      }),
    ).rejects.toThrow('not found')
  })
})

describe('getAppointmentsDayPage', () => {
  /** Mock the over-fetch query chain ending in `.limit(...)`, with a date window. */
  function mockWindowQuery(data: unknown) {
    const limit = vi.fn().mockResolvedValue({ data, error: null })
    const lte = vi.fn().mockReturnValue({ limit })
    const gte = vi.fn().mockReturnValue({ lte })
    const order2 = vi.fn().mockReturnValue({ gte })
    const order1 = vi.fn().mockReturnValue({ order: order2 })
    const select = vi.fn().mockReturnValue({ order: order1 })
    return { select, order1, order2, gte, lte, limit }
  }

  it('filters by the window, orders, and over-fetches one extra row', async () => {
    const rows = daySpread('2026-06-05', 3)
    const q = mockWindowQuery(rows)
    from.mockReturnValue({ select: q.select })

    const result = await getAppointmentsDayPage({
      from: '2026-06-01',
      to: '2026-06-07',
    })

    expect(from).toHaveBeenCalledWith('appointments')
    expect(q.select).toHaveBeenCalledWith(
      '*, entries:income_entries(*, service:services(name))',
    )
    expect(q.order1).toHaveBeenCalledWith('provided_on', { ascending: false })
    expect(q.order2).toHaveBeenCalledWith('created_at', { ascending: false })
    expect(q.gte).toHaveBeenCalledWith('provided_on', '2026-06-01')
    expect(q.lte).toHaveBeenCalledWith('provided_on', '2026-06-07')
    expect(q.limit).toHaveBeenCalledWith(DAY_FETCH_SIZE + 1)
    // Under the over-fetch limit → whole window loaded, every day complete.
    expect(result).toEqual({ rows, nextCursor: null })
  })

  it('uses `before` as the inclusive upper bound for later pages', async () => {
    const q = mockWindowQuery([])
    from.mockReturnValue({ select: q.select })

    await getAppointmentsDayPage({
      from: '2026-06-01',
      to: '2026-06-07',
      before: '2026-06-04',
    })

    expect(q.lte).toHaveBeenCalledWith('provided_on', '2026-06-04')
  })

  it('omits date filters when unbounded', async () => {
    const limit = vi.fn().mockResolvedValue({ data: null, count: null, error: null })
    const order2 = vi.fn().mockReturnValue({ limit })
    const order1 = vi.fn().mockReturnValue({ order: order2 })
    const select = vi.fn().mockReturnValue({ order: order1 })
    from.mockReturnValue({ select })

    const result = await getAppointmentsDayPage()

    expect(limit).toHaveBeenCalledWith(DAY_FETCH_SIZE + 1)
    expect(result).toEqual({ rows: [], nextCursor: null })
  })

  it('trims the oldest (possibly partial) day and returns it as the next cursor', async () => {
    // Over-fetch returns DAY_FETCH_SIZE + 1 rows spanning two days; the older
    // day may be cut off by the limit, so it is dropped for the next page.
    const complete = daySpread('2026-06-05', DAY_FETCH_SIZE - 2)
    const partial = daySpread('2026-06-04', 3)
    const q = mockWindowQuery([...complete, ...partial])
    from.mockReturnValue({ select: q.select })

    const result = await getAppointmentsDayPage({
      from: '2026-06-01',
      to: '2026-06-07',
    })

    expect(result).toEqual({ rows: complete, nextCursor: '2026-06-04' })
  })

  it('fetches a single oversized day in full and points the cursor before it', async () => {
    // All over-fetched rows are the same day → trimming leaves nothing, so the
    // day is re-fetched in full and the cursor moves strictly before it.
    const overflow = daySpread('2026-06-05', DAY_FETCH_SIZE + 1)
    const q = mockWindowQuery(overflow)

    const fullDay = daySpread('2026-06-05', 25)
    const dayGte = vi.fn().mockResolvedValue({ data: fullDay, error: null })
    const dayOrder = vi.fn().mockReturnValue({ gte: dayGte })
    const eq = vi.fn().mockReturnValue({ order: dayOrder })
    const daySelect = vi.fn().mockReturnValue({ eq })

    from
      .mockReturnValueOnce({ select: q.select })
      .mockReturnValueOnce({ select: daySelect })

    const result = await getAppointmentsDayPage({
      from: '2026-06-01',
      to: '2026-06-07',
    })

    expect(eq).toHaveBeenCalledWith('provided_on', '2026-06-05')
    expect(dayGte).toHaveBeenCalledWith('provided_on', '2026-06-01')
    expect(result).toEqual({ rows: fullDay, nextCursor: '2026-06-04' })
  })
})

describe('getAppointmentDayCount', () => {
  it('counts distinct provided_on days within the window', async () => {
    const lte = vi.fn().mockResolvedValue({
      data: [
        { provided_on: '2026-06-05' },
        { provided_on: '2026-06-05' },
        { provided_on: '2026-06-04' },
      ],
      error: null,
    })
    const gte = vi.fn().mockReturnValue({ lte })
    const select = vi.fn().mockReturnValue({ gte })
    from.mockReturnValue({ select })

    const result = await getAppointmentDayCount({
      from: '2026-06-01',
      to: '2026-06-07',
    })

    expect(from).toHaveBeenCalledWith('appointments')
    expect(select).toHaveBeenCalledWith('provided_on')
    expect(gte).toHaveBeenCalledWith('provided_on', '2026-06-01')
    expect(lte).toHaveBeenCalledWith('provided_on', '2026-06-07')
    expect(result).toBe(2)
  })

  it('returns 0 for an empty window', async () => {
    const select = vi.fn().mockResolvedValue({ data: null, error: null })
    from.mockReturnValue({ select })

    expect(await getAppointmentDayCount()).toBe(0)
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
