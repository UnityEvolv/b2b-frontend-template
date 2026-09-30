/**
 * Signing in through the organization's identity provider, in the person's
 * own browser rather than a view inside the app: the browser is
 * where their provider session, password manager and security keys are, and
 * an embedded view would let the app see the password.
 *
 * The hand-off: the app opens the identity service's sign-in start in the
 * browser, saying it is the desktop app and carrying a PKCE challenge. At
 * the end the identity service sends the browser to the app's scheme with a
 * one-time code; the app redeems it with the verifier only it holds, so a
 * code caught by another program that registered the same scheme is useless.
 */

export const START_PATH = '/v1/sign-in/start'

/** How long a sign-in in the browser may take before its verifier is thrown away. */
export const ATTEMPT_TTL_MS = 10 * 60_000

const base64url = (bytes: Uint8Array) => Buffer.from(bytes).toString('base64url')

/** A PKCE verifier and its S256 challenge (RFC 7636). */
export function pkcePair(
  random: (size: number) => Uint8Array,
  sha256: (text: string) => Uint8Array,
): { verifier: string; challenge: string } {
  const verifier = base64url(random(32))
  return { verifier, challenge: base64url(sha256(verifier)) }
}

/**
 * The address to open in the browser, from the one the web app asked for.
 * Only the identity service's own sign-in start is opened: the renderer is
 * the app, but what crosses the bridge is checked all the same. The app's
 * choice of email, app and next path is kept; the desktop's part is added.
 */
export function systemSignInUrl(
  requested: unknown,
  identityUrl: string | null,
  challenge: string,
): string | null {
  if (typeof requested !== 'string' || !identityUrl || requested.length > 4096) return null
  let url: URL
  try {
    url = new URL(requested)
  } catch {
    return null
  }
  const start = new URL(`${identityUrl}${START_PATH}`)
  if (url.origin !== start.origin || url.pathname !== start.pathname) return null
  if (url.username || url.password || url.hash) return null
  url.searchParams.set('client', 'desktop')
  url.searchParams.set('code_challenge', challenge)
  url.searchParams.set('code_challenge_method', 'S256')
  return url.toString()
}

/** The one sign-in in the browser this app is waiting for, if any. */
export class PendingSignIn {
  #verifier: string | null = null
  #startedAt = 0

  constructor(private readonly now: () => number = Date.now) {}

  begin(verifier: string): void {
    this.#verifier = verifier
    this.#startedAt = this.now()
  }

  /** The verifier, once: a code is redeemed at most once, and only while fresh. */
  take(): string | null {
    const verifier = this.#verifier
    this.#verifier = null
    if (!verifier || this.now() - this.#startedAt > ATTEMPT_TTL_MS) return null
    return verifier
  }
}
