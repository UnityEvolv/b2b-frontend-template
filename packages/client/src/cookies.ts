/**
 * The session cookie, for a platform with no browser cookie jar of its own
 * worth trusting (UO-89).
 *
 * The identity service keeps a session in an HttpOnly cookie on its host and
 * rotates it on every refresh. A browser keeps it; a phone app keeps it in
 * the platform keystore instead, and presents it by hand. So this reads the
 * `Set-Cookie` the service answers with, and says what the jar should now
 * hold: a new value, nothing (the service cleared it), or no change.
 */

/** The identity service's session cookie. */
export const SESSION_COOKIE = 'uo_session'

/** Where a session cookie is kept between launches: the keystore, on mobile. */
export interface SessionCookieStore {
  read(): Promise<string | null>
  write(value: string | null): Promise<void>
}

/** A store in memory, for tests and for a platform with nowhere safer. */
export function memoryCookieStore(initial: string | null = null): SessionCookieStore & {
  current(): string | null
} {
  let value = initial
  return {
    current: () => value,
    read: async () => value,
    write: async (next) => {
      value = next
    },
  }
}

/**
 * Split a `Set-Cookie` header that the platform joined with commas.
 *
 * A comma also appears inside an `Expires` date, so a split happens only
 * where the next part starts a new `name=`.
 */
export function splitSetCookie(header: string): string[] {
  return header
    .split(/,\s*(?=[^;,=\s]+=)/)
    .map((part) => part.trim())
    .filter((part) => part !== '')
}

/**
 * What a response did to one cookie: its new value, `null` when it was
 * cleared (empty, `Max-Age` of zero or less, or expired), or `undefined`
 * when the response did not mention it.
 */
export function cookieFrom(
  header: string | null | undefined,
  name: string = SESSION_COOKIE,
  now: number = Date.now(),
): string | null | undefined {
  if (!header) return undefined
  let result: string | null | undefined
  for (const cookie of splitSetCookie(header)) {
    const [pair = '', ...attributes] = cookie.split(';').map((part) => part.trim())
    const eq = pair.indexOf('=')
    if (eq < 0 || pair.slice(0, eq).trim() !== name) continue
    const value = pair.slice(eq + 1).trim()
    let cleared = value === ''
    for (const attribute of attributes) {
      const [key = '', ...rest] = attribute.split('=')
      const lower = key.trim().toLowerCase()
      const setting = rest.join('=').trim()
      if (lower === 'max-age' && Number(setting) <= 0) cleared = true
      if (lower === 'expires') {
        const at = Date.parse(setting)
        if (!Number.isNaN(at) && at <= now) cleared = true
      }
    }
    // The last mention wins, as it would in a browser.
    result = cleared ? null : value
  }
  return result
}
