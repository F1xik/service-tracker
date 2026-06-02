import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Capture the args every `createClient` call receives so we can assert the
// module wires the env vars through to the single shared instance.
const createClient = vi.fn(() => ({ marker: 'mock-client' }))

vi.mock('@supabase/supabase-js', () => ({ createClient }))

describe('lib/supabase', () => {
  beforeEach(() => {
    // The module reads env and calls createClient at import time, so each test
    // needs a fresh module registry and a clean spy.
    vi.resetModules()
    createClient.mockClear()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('creates a single client from the configured env vars', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon-key-123')

    const mod = await import('@/lib/supabase')

    expect(createClient).toHaveBeenCalledTimes(1)
    expect(createClient).toHaveBeenCalledWith(
      'https://example.supabase.co',
      'anon-key-123',
    )
    expect(mod.supabase).toEqual({ marker: 'mock-client' })
  })

  it('throws a helpful error when the URL is missing', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', '')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon-key-123')

    await expect(import('@/lib/supabase')).rejects.toThrow(
      /Missing Supabase configuration/,
    )
    expect(createClient).not.toHaveBeenCalled()
  })

  it('throws when the anon key is missing', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', '')

    await expect(import('@/lib/supabase')).rejects.toThrow(/VITE_SUPABASE_ANON_KEY/)
    expect(createClient).not.toHaveBeenCalled()
  })
})
