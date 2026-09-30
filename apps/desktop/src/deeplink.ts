/**
 * Links into the app. The installer registers the app's scheme, so
 * `<scheme>://accept-invite?token=…` opens the desktop app on the same page
 * the web app has at `/accept-invite?token=…`. Only the pages a link in an
 * email or a sign-in points at are reachable this way; anything else in a
 * link is dropped, since any program on the machine can open one.
 */

/** What a link asks for: a page of the app, or the end of a sign-in in the browser. */
export type DeepLink =
  | { kind: 'open'; path: string }
  | { kind: 'sign-in'; code: string | null; error: string | null; next: string }

/** The pages a link may open, as the web app's routes. */
const PAGES = [/^\/accept-invite$/, /^\/reset-password$/, /^\/set-password$/, /^\/verify-email$/]

/** Where a sign-in in the browser comes back to. */
export const SIGN_IN_CALLBACK = '/auth/callback'

const MAX_LENGTH = 4096

/** A path inside the app, never another origin; the home page otherwise. */
export function safePath(next: string | null): string {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.includes('\\')) return '/'
  return next.slice(0, 1024)
}

/**
 * The link, read. `<scheme>://verify-email` and `<scheme>:///verify-email` are the
 * same page: the first names it as a host, which is how most mail clients
 * keep the link intact.
 */
export function parseDeepLink(raw: string, scheme: string): DeepLink | null {
  if (typeof raw !== 'string' || raw.length > MAX_LENGTH) return null
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return null
  }
  if (url.protocol !== `${scheme}:`) return null
  const path = `/${url.host}${url.pathname}`.replace(/\/{2,}/g, '/').replace(/(.)\/$/, '$1')

  if (path === SIGN_IN_CALLBACK) {
    const code = url.searchParams.get('code')
    const error = url.searchParams.get('error')
    return {
      kind: 'sign-in',
      code: code && /^[A-Za-z0-9_.~-]{1,512}$/.test(code) ? code : null,
      error: error && /^[a-z_]{1,64}$/.test(error) ? error : null,
      next: safePath(url.searchParams.get('next')),
    }
  }
  if (!PAGES.some((page) => page.test(path))) return null
  return { kind: 'open', path: `${path}${url.search}` }
}

/**
 * The link a launch was given, if any: Windows passes it on the command
 * line, to the first launch and to the second one the lock turns away.
 */
export function deepLinkFrom(argv: readonly string[], scheme: string): string | null {
  return argv.find((arg) => arg.toLowerCase().startsWith(`${scheme}:`)) ?? null
}
