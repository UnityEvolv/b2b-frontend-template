import { appScheme } from './app-identity'
import { env } from './env'

/**
 * Reading the addresses the app is opened with: the system browser coming
 * back from an organization's sign-in, and the links in emails.
 * Pure and by hand, because React Native's URL is incomplete.
 */

export interface ParsedLink {
  /** The path, without a leading slash: `auth/callback`, `accept-invite`. */
  path: string
  params: Record<string, string>
}

function decode(part: string): string {
  try {
    return decodeURIComponent(part.replace(/\+/g, ' '))
  } catch {
    return part
  }
}

/**
 * The path and query of an app link or a web link.
 *
 * `b2bapp://accept-invite?token=x` and `https://host/accept-invite?token=x`
 * read the same: the scheme's "host" is the first path segment, as Android
 * and Expo treat it.
 */
export function parseLink(url: string): ParsedLink | null {
  const match = /^([a-z][a-z0-9+.-]*):\/\/([^?#]*)(?:\?([^#]*))?/i.exec(url.trim())
  if (!match) return null
  const scheme = match[1]!.toLowerCase()
  let rest = match[2] ?? ''
  // A web link's first segment is its host; an app link's is its first path segment.
  if (scheme === 'http' || scheme === 'https') rest = rest.replace(/^[^/]*/, '')
  const path = rest.replace(/^\/+|\/+$/g, '')
  const params: Record<string, string> = {}
  for (const pair of (match[3] ?? '').split('&')) {
    if (!pair) continue
    const eq = pair.indexOf('=')
    const key = decode(eq < 0 ? pair : pair.slice(0, eq))
    if (key && !(key in params)) params[key] = decode(eq < 0 ? '' : pair.slice(eq + 1))
  }
  return { path, params }
}

/**
 * Where the identity service sends the browser back, fixed on its side for
 * the app's scheme; the browser session closes when it gets there.
 */
export const SIGN_IN_RETURN = `${appScheme(env.EXPO_PUBLIC_APP_SCHEME)}://auth/callback`

/** What the system browser came back with from an organization's sign-in. */
export type SignInReturn =
  | { kind: 'code'; code: string; next: string | null }
  | { kind: 'error'; error: string }
  | { kind: 'unknown' }

export function signInReturn(url: string): SignInReturn {
  const link = parseLink(url)
  if (!link || link.path !== 'auth/callback') return { kind: 'unknown' }
  if (link.params.error) return { kind: 'error', error: link.params.error }
  if (link.params.code) {
    const next = link.params.next
    // A path inside the app, never another origin.
    const safe = next && next.startsWith('/') && !next.startsWith('//') ? next : null
    return { kind: 'code', code: link.params.code, next: safe }
  }
  return { kind: 'unknown' }
}

/** Standard base64 as base64url without padding, for a PKCE challenge. */
export function base64Url(base64: string): string {
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~'

/** A PKCE verifier from random bytes: 43 or more characters of the unreserved set. */
export function verifierFrom(bytes: Uint8Array): string {
  let out = ''
  for (const byte of bytes) out += ALPHABET[byte % ALPHABET.length]
  return out
}
