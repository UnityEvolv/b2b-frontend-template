/**
 * @b2b-template/theme
 *
 * Light and dark are both first-class. The preference belongs to the person, not
 * the device: it is stored on the server and follows them to a second browser,
 * the phone and the desktop app. "Follow the system" is the default, and it is a
 * preference in its own right, not the absence of one.
 *
 * No DOM here. Each platform reports whether its system is dark, and applies the
 * result its own way: `data-theme` on web, the appearance API on React Native,
 * `nativeTheme` in Electron.
 */

export const THEME_PREFERENCES = ['system', 'light', 'dark'] as const
export type ThemePreference = (typeof THEME_PREFERENCES)[number]
export type Theme = 'light' | 'dark'

export const DEFAULT_THEME_PREFERENCE: ThemePreference = 'system'

export const isThemePreference = (value: unknown): value is ThemePreference =>
  typeof value === 'string' && (THEME_PREFERENCES as readonly string[]).includes(value)

export function resolveTheme(preference: ThemePreference, systemIsDark: boolean): Theme {
  if (preference === 'system') return systemIsDark ? 'dark' : 'light'
  return preference
}

/**
 * The right variant of something that comes in both themes.
 *
 * A background, a logo, a thumbnail. A missing dark variant falls back to the
 * light one: a picture is valid without it, and a light picture in dark mode
 * beats no picture.
 */
export function pickThemed<T>(variants: { light: T; dark?: T | null }, theme: Theme): T {
  return theme === 'dark' && variants.dark != null ? variants.dark : variants.light
}

/** The two themes' surfaces by role, for a platform without CSS. */
export { PALETTE, type Palette } from './palette'
