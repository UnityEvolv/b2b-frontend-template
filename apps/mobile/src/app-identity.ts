/**
 * The app's name, link scheme and bundle identifier when the build names
 * none. app.config.ts reads EXPO_PUBLIC_APP_NAME, EXPO_PUBLIC_APP_SCHEME and
 * EXPO_PUBLIC_APP_BUNDLE_ID over the same JSON; the app reads the scheme the
 * same way, for the sign-in browser's way back.
 */
import DEFAULTS from './app-identity.json'

export const APP_DEFAULTS = DEFAULTS

/** The scheme this build answers to: the build's setting, or the default. */
export function appScheme(configured: string | undefined): string {
  const value = configured?.trim()
  return value && /^[a-z][a-z0-9+.-]*$/.test(value) ? value : APP_DEFAULTS.scheme
}
