/**
 * What the shell is pointed at (UO-117). Configuration, never a literal:
 * the environment at launch wins, then the `desktop.json` the build wrote
 * next to the web app from the same variables, so an installed app carries
 * its own addresses. Nothing set means the shell reaches nothing beyond
 * itself, and every feature that needs an address stays off.
 */

/** Where updates come from: a plain web folder, or a GitHub repository's releases. */
export type UpdateFeed =
  { provider: 'generic'; url: string } | { provider: 'github'; owner: string; repo: string }

export interface DesktopConfig {
  /** The API gateway, for the policy's connect-src. */
  apiOrigin: string | null
  /**
   * The identity service as the app calls it: the gateway's `/identity`, or
   * its own origin on a laptop. Its session cookie is kept in the keychain.
   */
  identityUrl: string | null
  update: UpdateFeed | null
}

/** The variables, by the names the build and the launch both use. */
export const CONFIG_VARIABLES = [
  'DESKTOP_API_ORIGIN',
  'DESKTOP_IDENTITY_ORIGIN',
  'DESKTOP_UPDATE_URL',
  'DESKTOP_UPDATE_GITHUB',
] as const

type Variables = Partial<Record<(typeof CONFIG_VARIABLES)[number], string>>

/** An http(s) or ws(s) origin-ish address, without a trailing slash; null for anything else. */
function address(value: string | undefined, schemes: string[]): string | null {
  if (!value) return null
  try {
    const url = new URL(value.trim())
    if (!schemes.includes(url.protocol)) return null
    return url.toString().replace(/\/$/, '')
  } catch {
    return null
  }
}

/** The update feed a configuration names, or null for none or a malformed one. */
export function updateFeed(vars: Variables): UpdateFeed | null {
  // Only over https: an update is code that runs next launch.
  const url = address(vars.DESKTOP_UPDATE_URL, ['https:'])
  if (url) return { provider: 'generic', url }
  const github = /^([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)$/.exec(
    vars.DESKTOP_UPDATE_GITHUB?.trim() ?? '',
  )
  if (github) return { provider: 'github', owner: github[1]!, repo: github[2]! }
  return null
}

/**
 * The configuration from the environment over the build's file. Both are
 * read as the same variable names, so `desktop.json` is simply the build's
 * environment written down.
 */
export function readConfig(env: Record<string, string | undefined>, file: unknown): DesktopConfig {
  const saved: Variables = {}
  if (file && typeof file === 'object') {
    for (const name of CONFIG_VARIABLES) {
      const value = (file as Record<string, unknown>)[name]
      if (typeof value === 'string' && value !== '') saved[name] = value
    }
  }
  const vars: Variables = { ...saved }
  for (const name of CONFIG_VARIABLES) if (env[name]) vars[name] = env[name]

  const apiOrigin = address(vars.DESKTOP_API_ORIGIN, ['https:', 'http:'])
  return {
    apiOrigin,
    identityUrl:
      address(vars.DESKTOP_IDENTITY_ORIGIN, ['https:', 'http:']) ??
      (apiOrigin ? `${apiOrigin}/identity` : null),
    update: updateFeed(vars),
  }
}
