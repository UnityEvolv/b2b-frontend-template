import {
  PALETTE,
  resolveTheme,
  type Palette,
  type Theme,
  type ThemePreference,
} from '@b2b-template/theme'
import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { useColorScheme } from 'react-native'

/**
 * The theme on the phone: the person's saved choice, resolved against the
 * system's appearance, as colour roles from the shared palette. A screen
 * asks for a role (`colors.accent`), never a colour.
 */
interface ThemeValue {
  theme: Theme
  colors: Palette
}

const ThemeContext = createContext<ThemeValue>({ theme: 'light', colors: PALETTE.light })

export function ThemeRoot({
  preference,
  children,
}: {
  preference: ThemePreference
  children: ReactNode
}) {
  const system = useColorScheme()
  const theme = resolveTheme(preference, system === 'dark')
  const value = useMemo(() => ({ theme, colors: PALETTE[theme] }), [theme])
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useColors(): Palette {
  return useContext(ThemeContext).colors
}

export function useTheme(): Theme {
  return useContext(ThemeContext).theme
}
