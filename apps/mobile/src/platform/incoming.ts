import * as Linking from 'expo-linking'
import { useCallback, useEffect, useState } from 'react'

import { linkTarget, type LinkTarget } from '../deeplinks'

/**
 * The link the app was opened with, or opened by while running.
 * Each new link gets a new serial, so a screen that shows it starts afresh
 * even when the same link is followed twice.
 */
export function useIncomingLink(): {
  target: LinkTarget | null
  serial: number
  clear(): void
} {
  const [state, setState] = useState<{ target: LinkTarget | null; serial: number }>({
    target: null,
    serial: 0,
  })

  useEffect(() => {
    let current = true
    const take = (url: string | null) => {
      const target = linkTarget(url)
      if (target && current) setState((s) => ({ target, serial: s.serial + 1 }))
    }
    void Linking.getInitialURL().then(take, () => undefined)
    const sub = Linking.addEventListener('url', ({ url }) => take(url))
    return () => {
      current = false
      sub.remove()
    }
  }, [])

  const clear = useCallback(() => setState((s) => ({ target: null, serial: s.serial })), [])
  return { ...state, clear }
}
