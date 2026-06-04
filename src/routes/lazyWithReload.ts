import { lazy, type ComponentType } from 'react'

// Guards against a reload loop: set just before we reload, cleared on the first
// successful import after the page comes back.
const RELOAD_FLAG = 'route-chunk-reloaded'

// A dynamic import() can fail when a new deploy replaces the hashed chunk files
// the currently-loaded index.html points at. The host then serves index.html
// (Content-Type text/html) in place of the missing .js file, and the browser
// rejects it. The message differs per engine:
//   Safari/WebKit: "'text/html' is not a valid JavaScript MIME type"
//   Chromium:      "Failed to fetch dynamically imported module"
//   Firefox:       "error loading dynamically imported module"
function isStaleChunkError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error)
  return /Failed to fetch dynamically imported module|error loading dynamically imported module|is not a valid JavaScript MIME type|Importing a module script failed|Unable to preload CSS/i.test(
    message,
  )
}

/**
 * Drop-in replacement for React.lazy that recovers from the "stale chunk after
 * deploy" failure: it reloads the page once so the browser fetches the fresh
 * index.html (and its new chunk names). A sessionStorage flag stops this from
 * looping when the import is genuinely broken (e.g. offline) — in that case the
 * error is rethrown and surfaces in the route's errorElement.
 */
export function lazyWithReload<T extends ComponentType<unknown>>(
  factory: () => Promise<{ default: T }>,
) {
  return lazy(async () => {
    try {
      const mod = await factory()
      window.sessionStorage.removeItem(RELOAD_FLAG)
      return mod
    } catch (error) {
      if (isStaleChunkError(error) && !window.sessionStorage.getItem(RELOAD_FLAG)) {
        window.sessionStorage.setItem(RELOAD_FLAG, '1')
        window.location.reload()
        // Never resolve: keep the Suspense fallback up while the page reloads
        // rather than flashing the error boundary first.
        return new Promise<{ default: T }>(() => {})
      }
      throw error
    }
  })
}
