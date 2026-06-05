import { Component, Suspense, type ReactNode } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { lazyWithReload } from './lazyWithReload'

const RELOAD_FLAG = 'route-chunk-reloaded'

// Minimal boundary so we can assert the "rethrow" branch surfaces an error.
class TestBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    return this.state.failed ? <div>caught</div> : this.props.children
  }
}

function renderLazy(factory: () => Promise<{ default: () => ReactNode }>) {
  const Lazy = lazyWithReload(factory)
  return render(
    <TestBoundary>
      <Suspense fallback={<div>loading</div>}>
        <Lazy />
      </Suspense>
    </TestBoundary>,
  )
}

describe('lazyWithReload', () => {
  const originalLocation = window.location
  let reloadSpy: ReturnType<typeof vi.fn>

  beforeEach(() => {
    window.sessionStorage.clear()
    reloadSpy = vi.fn()
    // jsdom's window.location.reload is non-configurable, so spyOn can't wrap
    // it — swap in a stand-in location whose reload we control.
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...originalLocation, reload: reloadSpy },
    })
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: originalLocation,
    })
    vi.restoreAllMocks()
  })

  it('reloads once and stays on the fallback when a stale chunk fails to import', async () => {
    renderLazy(() =>
      Promise.reject(new Error("'text/html' is not a valid JavaScript MIME type")),
    )

    await waitFor(() => expect(reloadSpy).toHaveBeenCalledTimes(1))
    expect(window.sessionStorage.getItem(RELOAD_FLAG)).toBe('1')
    expect(screen.getByText('loading')).toBeInTheDocument()
    expect(screen.queryByText('caught')).not.toBeInTheDocument()
  })

  it('rethrows instead of looping when a stale chunk fails again after one reload', async () => {
    window.sessionStorage.setItem(RELOAD_FLAG, '1')
    renderLazy(() =>
      Promise.reject(new Error('Failed to fetch dynamically imported module')),
    )

    await waitFor(() => expect(screen.getByText('caught')).toBeInTheDocument())
    expect(reloadSpy).not.toHaveBeenCalled()
  })

  it('rethrows a non-chunk error without reloading', async () => {
    renderLazy(() => Promise.reject(new Error('boom')))

    await waitFor(() => expect(screen.getByText('caught')).toBeInTheDocument())
    expect(reloadSpy).not.toHaveBeenCalled()
  })

  it('clears the reload flag after a successful import', async () => {
    window.sessionStorage.setItem(RELOAD_FLAG, '1')
    renderLazy(() => Promise.resolve({ default: () => <div>page</div> }))

    await waitFor(() => expect(screen.getByText('page')).toBeInTheDocument())
    expect(window.sessionStorage.getItem(RELOAD_FLAG)).toBeNull()
  })
})
