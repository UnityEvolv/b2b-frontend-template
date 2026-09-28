/**
 * A controllable `matchMedia`, since jsdom has none.
 *
 * Tests flip the system between light and dark with `setSystemDark`, and every
 * listener hears it, which is how the "switch the OS, the app follows without a
 * reload" behaviour is tested.
 */
type Listener = (event: { matches: boolean }) => void

let dark = false
const listeners = new Set<Listener>()

export function setSystemDark(next: boolean) {
  dark = next
  for (const listener of listeners) listener({ matches: next })
}

export function resetSystemTheme() {
  dark = false
  listeners.clear()
}

if (typeof window !== 'undefined') {
  window.matchMedia = ((query: string) => ({
    get matches() {
      return query.includes('dark') ? dark : false
    },
    media: query,
    onchange: null,
    addEventListener: (_: string, listener: Listener) => listeners.add(listener),
    removeEventListener: (_: string, listener: Listener) => listeners.delete(listener),
    addListener: (listener: Listener) => listeners.add(listener),
    removeListener: (listener: Listener) => listeners.delete(listener),
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia
}
