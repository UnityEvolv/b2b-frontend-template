import { storageKey } from '@b2b-template/product-config'
import {
  DEFAULT_THEME_PREFERENCE,
  isThemePreference,
  resolveTheme,
  type Theme,
  type ThemePreference,
} from '@b2b-template/theme'
import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from 'react'

import { useSession } from './session'
import { readCache, writeCache } from './storage'

/**
 * Where the last known preference is cached on this device.
 *
 * Only a cache. The preference itself is on the server; this exists so the
 * first paint is already in the right theme, before the session has loaded,
 * and so a reload does not flash white at somebody who chose dark.
 */
export const THEME_CACHE_KEY = storageKey('theme')

/** Matches the query the first-paint script in `@b2b-template/app-config` uses. */
export const DARK_QUERY = '(prefers-color-scheme: dark)'

function subscribeToSystem(onChange: () => void) {
  const query = window.matchMedia(DARK_QUERY)
  query.addEventListener('change', onChange)
  return () => query.removeEventListener('change', onChange)
}

const systemIsDark = () => window.matchMedia(DARK_QUERY).matches

export interface ThemeContextValue {
  preference: ThemePreference
  /** What is showing now. Everything that picks an asset by theme reads this. */
  theme: Theme
  setPreference(preference: ThemePreference): Promise<void>
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

/**
 * Resolves the person's preference and the system setting into the theme, and
 * applies unitykit's tokens by setting `data-theme` on the root element.
 *
 * Follows the system live: switching the OS to dark switches every open app
 * without a reload.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const { state, savePreferences } = useSession()
  const dark = useSyncExternalStore(subscribeToSystem, systemIsDark, () => false)

  const saved = state.status === 'signed-in' ? state.session.user.preferences.theme : null
  const cached = readCache(THEME_CACHE_KEY)
  const preference: ThemePreference =
    saved ?? (isThemePreference(cached) ? cached : DEFAULT_THEME_PREFERENCE)
  const theme = resolveTheme(preference, dark)

  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  // The server's answer is the truth; the cache follows it.
  useLayoutEffect(() => {
    if (saved) writeCache(THEME_CACHE_KEY, saved)
  }, [saved])

  const setPreference = useCallback(
    async (next: ThemePreference) => {
      writeCache(THEME_CACHE_KEY, next)
      await savePreferences({ theme: next })
    },
    [savePreferences],
  )

  const value = useMemo(
    () => ({ preference, theme, setPreference }),
    [preference, theme, setPreference],
  )
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  const value = useContext(ThemeContext)
  if (!value) throw new Error('useTheme is used outside ThemeProvider')
  return value
}
