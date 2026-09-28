/**
 * Device-local caches, which may not exist.
 *
 * Private windows, blocked site data and some embedded browsers throw on any
 * access to `localStorage`. Everything cached here is a convenience with a
 * server-side source of truth, so a failure is silently a cache miss.
 */
export function readCache(key: string): string | null {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

export function writeCache(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    // A cache that cannot be written is a cache miss next time. Nothing to do.
  }
}
