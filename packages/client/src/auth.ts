import { storageKey } from '@b2b-template/product-config'
import { createApi, isApiError, type Api, type ServiceName } from '@b2b-template/api'

import { createAccountClient, type AccountClient } from './account'
import { cookieFrom, SESSION_COOKIE, type SessionCookieStore } from './cookies'
import { SignInRefused } from './errors'
import type { Preferences, Session, SessionImpersonation, SessionSource } from './session'

/**
 * Sign-in and the session behind it, for the web apps and
 * the phone.
 *
 * The identity service keeps the session in an HttpOnly cookie on the API
 * host and hands out short-lived access tokens against it. This module asks
 * for a token, keeps it fresh, presents it on every call, and turns the
 * answer of `/v1/me` and the org's permission configuration into the
 * `Session` the shell renders from. No page talks to the identity service
 * directly; the sign-in page goes through `Auth.signIn`.
 *
 * On web the browser carries the cookie. On mobile there is no browser: the
 * app passes a `SessionCookieStore` over the platform keystore, and the
 * cookie is read from each answer and presented on each call by hand.
 */

/**
 * The apps, by the names the identity service's configured apps use (its
 * APP_NAMES, `account,admin,platform` by default): sign-in and the account emails
 * send them as they are.
 */
export type AuthApp = 'account' | 'admin' | 'platform'

/** The header a public form's bot-check token travels in. */
export const CAPTCHA_HEADER = 'X-Captcha-Token'

/**
 * Where each service is: `${origin}/${service}` behind the deployed API
 * gateway, or, on a laptop where `docker compose` gives each service its own
 * port, the origin named for it in the app's configuration. Never a literal
 * in code; a service with no address is a configuration error said out
 * loud, not a request to nowhere.
 */
export function serviceOrigins(
  apiOrigin?: string,
  overrides: Partial<Record<ServiceName, string | undefined>> = {},
  envPrefix = 'VITE_',
): (service: ServiceName) => string {
  const origin = apiOrigin?.replace(/\/$/, '')
  return (service) => {
    const named = overrides[service]?.replace(/\/$/, '')
    if (named) return named
    if (origin) return `${origin}/${service}`
    throw new Error(
      `no address for the ${service} service: set ${envPrefix}API_ORIGIN, or ${envPrefix}API_ORIGIN_${service.toUpperCase()}`,
    )
  }
}

/**
 * The mark of a support session: a platform operator seeing the org as this
 * person, read-only, until `ends_at`. The identity service sets it on the
 * support session's refresh; an ordinary session never has it.
 */
export interface ImpersonationMarker {
  impersonation_id: string
  impersonator_id: string
  grant_id?: string
  ends_at: string
  read_only: boolean
}

/** What the identity service answers with, after a sign-in or a refresh. */
export interface AccessToken {
  access_token: string
  expires_in: number
  user_id: string
  org_id?: string
  membership_id?: string
  choose_organization: boolean
  impersonation?: ImpersonationMarker
}

/** Why a support session ended: the API's code (or the live event's) and its sentence. */
export interface SupportEnd {
  code: string
  message?: string
}

/**
 * A support session, in the tab the platform app opened for it
 * (docs/impersonation.md). Absent outside one.
 */
export interface SupportControl {
  /** How it ended, once it has; null while it runs. */
  ended(): SupportEnd | null
  /** Called once when it ends: the time box, an Owner, the operator, or a refused refresh. */
  onEnded(listener: (end: SupportEnd) => void): () => void
  /** Called when the API refused a write with `impersonation.read_only`. */
  onReadOnly(listener: () => void): () => void
  /** The operator ends it here: the support cookie is cleared and the session revoked. */
  end(): Promise<void>
}

/** The error code a support session's writes are refused with. */
export const IMPERSONATION_READ_ONLY = 'impersonation.read_only'
/** The error code a support session's refresh answers once it is over. */
export const IMPERSONATION_ENDED = 'impersonation.ended'

/** A parked sign-in: a second factor is due, or must be set up first. */
export interface MfaStep {
  mfa: 'challenge' | 'enroll'
  challenge_token?: string
  enrollment_token?: string
}

export type LocalSignInResult = { kind: 'signed-in' } | { kind: 'mfa'; step: MfaStep }

/**
 * Who is signing in through the provider. The web app is the browser
 * itself. The desktop app and the phone open the person's
 * own browser: the identity service then starts no session there, and
 * sends the browser to the app's scheme (`<scheme>://auth/callback`) with
 * a one-time code, which the app trades with the PKCE verifier only it
 * holds. No token ever travels in a URL.
 */
export type SignInClientKind = 'web' | 'desktop' | 'mobile'

export interface SignInClient {
  /** How an address signs in: through its org's provider, or with a password. */
  methods(email: string): Promise<'sso' | 'local'>
  /**
   * Where the browser goes to sign in through the org's provider. An app
   * says which it is and passes its PKCE challenge (S256, base64url); the
   * desktop shell adds its own challenge to the address it is handed.
   */
  ssoStartUrl(
    email: string,
    next: string,
    client?: Exclude<SignInClientKind, 'web'>,
    codeChallenge?: string,
  ): string
  /**
   * An app's end of a sign-in in the browser: the one-time code the
   * identity service sent back to the app, redeemed with the verifier only
   * this app holds, for the session and a token.
   */
  exchange(code: string, verifier: string): Promise<void>
  /** Email and password. Resolves to the session, or to a second-factor step. */
  local(email: string, password: string): Promise<LocalSignInResult>
  /** The code from the app, or a recovery code, finishing a parked sign-in. */
  mfa(challengeToken: string, code: string): Promise<void>
}

/** One of the person's organizations, for the switcher. */
export interface OrgChoice {
  orgId: string
  name: string
  role: string
  active: boolean
}

export interface Auth {
  api: Api
  sessionSource: SessionSource
  signIn: SignInClient
  /** The flows around sign-in: invites, verification, passwords, the second factor. */
  account: AccountClient
  /** The person's organizations, for the switcher, and moving between them. */
  orgs: {
    list(): Promise<OrgChoice[]>
    switchTo(orgId: string): Promise<void>
  }
  /** The bearer token for a request now, refreshed when it is about to expire. */
  getToken(): Promise<string | null>
  /**
   * The live session events stream (`GET /v1/session/events` on the
   * identity service), opened with the session cookie: see `openLiveSession`.
   * A support session's names its own cookie (`?impersonation=true`).
   */
  eventsUrl: string
  /** The support session this tab is, or null for an ordinary one. */
  support: SupportControl | null
}

/** A device-local cache, which may not exist. A failure is a miss. */
export interface Cache {
  read(key: string): string | null
  write(key: string, value: string): void
}

export interface AuthOptions {
  app: AuthApp
  /** The deployed API origin, from the build's configuration; absent on a laptop. */
  apiOrigin?: string
  /** One service's origin, when it is not under the API origin: the laptop's ports. */
  serviceOrigin?: Partial<Record<ServiceName, string | undefined>>
  /** How the build's configuration names these, for the error when one is missing. */
  envPrefix?: string
  /**
   * Roles that may use this app. The admin app refuses a plain User even
   * with valid credentials: they are signed out again and told why.
   */
  roles?: readonly string[]
  /**
   * Organizations whose members may use this app. The platform app admits
   * only the platform org: staff, never a customer, whatever their role.
   */
  orgs?: readonly string[]
  /**
   * Where the session cookie is kept, on a platform whose own jar is not
   * used: the keystore on mobile. Absent on web, where the browser keeps it.
   */
  cookies?: SessionCookieStore
  /**
   * Refresh an expired token before a request rather than sending it
   * without one. A phone app resumes after hours in the background and its
   * first call must not fail for that.
   */
  refreshOnRequest?: boolean
  /**
   * This tab is a support session the platform app opened: the session is
   * the support cookie's (`<prefix>_impersonation`), never the ordinary
   * one, refreshed at `/v1/session/impersonation/refresh` and ended at
   * `/v1/session/impersonation/end`. Its token is kept in memory only, and
   * nothing of the person's is written to the device's cache. Web only.
   */
  support?: boolean
  /** The device's cache for first paint: the preferences. */
  cache?: Cache
  /** For tests: a fetch that answers instead of the network. */
  fetch?: typeof globalThis.fetch
  /** For tests: the clock. */
  now?: () => number
}

const PREFERENCES_KEY = storageKey('preferences')
/** Refresh this long before the token would expire, so a request never carries a dead one. */
const REFRESH_MARGIN_MS = 60_000

/**
 * The reason the shell's session is signed out when it is, for the sign-in
 * page: `not_admin` when this app refused a valid sign-in for its role,
 * `not_staff` when the platform app refused someone who is not staff,
 * `signed_out` when the server ended the session while the app was open,
 * `support_ended` when a support session is over.
 */
export type SignedOutReason = 'not_admin' | 'not_staff' | 'signed_out' | 'support_ended'

/** The session's support mark, from the support session's token. */
function impersonationOf(token: AccessToken, now: number): SessionImpersonation {
  const marker = token.impersonation
  return {
    id: marker?.impersonation_id ?? '',
    impersonatorId: marker?.impersonator_id ?? '',
    ...(marker?.grant_id ? { grantId: marker.grant_id } : {}),
    // The token never outlives the time box: without a marker, its expiry is the end.
    endsAt: marker?.ends_at ?? new Date(now + token.expires_in * 1000).toISOString(),
    // Read-only unless the server says otherwise; the template's never does.
    readOnly: marker?.read_only !== false,
  }
}

export function createAuth(options: AuthOptions): Auth & { reason(): SignedOutReason | null } {
  const origins = serviceOrigins(options.apiOrigin, options.serviceOrigin, options.envPrefix)
  const now = options.now ?? (() => Date.now())
  const support = options.support === true
  // A support session writes nothing of the person's to the operator's device.
  const cache = support ? undefined : options.cache
  const baseFetch =
    options.fetch ??
    ((input: RequestInfo | URL, init?: RequestInit) => globalThis.fetch(input, init))

  const loadPreferences = (): Preferences => {
    try {
      const saved = JSON.parse(cache?.read(PREFERENCES_KEY) ?? '{}') as Partial<Preferences>
      return {
        theme: saved.theme ?? 'system',
        language: typeof saved.language === 'string' ? saved.language : null,
      }
    } catch {
      return { theme: 'system', language: null }
    }
  }

  let token: { value: string; expiresAt: number; body: AccessToken } | null = null
  let refreshing: Promise<AccessToken | null> | null = null
  let reason: SignedOutReason | null = null

  // The session cookie lives on the API host; every call to the identity
  // service carries it. Nothing else needs cookies.
  const cookies = options.cookies
  const withCredentials: typeof globalThis.fetch = cookies
    ? async (input, init) => {
        const kept = await cookies.read()
        const headers = new Headers(init?.headers)
        if (kept) headers.set('Cookie', `${SESSION_COOKIE}=${kept}`)
        // The platform's own jar stays out of it: the keystore is the one jar.
        const response = await baseFetch(input, { ...init, headers, credentials: 'omit' })
        const next = cookieFrom(response.headers.get('set-cookie'), SESSION_COOKIE, now())
        if (next !== undefined) await cookies.write(next)
        return response
      }
    : (input, init) => baseFetch(input, { ...init, credentials: 'include' })

  const identityUrl = (path: string) => `${origins('identity')}${path}`

  const hold = (body: AccessToken) => {
    token = { value: body.access_token, expiresAt: now() + body.expires_in * 1000, body }
  }

  // A support session: how it ended, and who is told.
  let supportEnd: SupportEnd | null = null
  const endListeners = new Set<(end: SupportEnd) => void>()
  const readOnlyListeners = new Set<() => void>()
  const supportEnded = (end: SupportEnd) => {
    token = null
    reason = 'support_ended'
    if (supportEnd) return
    supportEnd = end
    for (const listener of [...endListeners]) listener(end)
  }

  /** One refresh at a time; a token that expired is not presented. */
  const refresh = (): Promise<AccessToken | null> => {
    if (support && supportEnd) return Promise.resolve(null)
    if (!refreshing) {
      const path = support ? '/v1/session/impersonation/refresh' : '/v1/session/refresh'
      refreshing = withCredentials(identityUrl(path), { method: 'POST' })
        .then(async (response) => {
          if (!response.ok) {
            token = null
            if (support && response.status === 401) {
              // Over: its time box, an Owner, the operator, or never one.
              const body = (await response.json().catch(() => null)) as unknown
              supportEnded(
                isApiError(body)
                  ? { code: body.code, message: body.message }
                  : { code: IMPERSONATION_ENDED },
              )
            }
            return null
          }
          const body = (await response.json()) as AccessToken
          hold(body)
          return body
        })
        .finally(() => {
          refreshing = null
        })
    }
    return refreshing
  }

  const fresh = () => (token && token.expiresAt - REFRESH_MARGIN_MS > now() ? token.value : null)

  const getToken = async (): Promise<string | null> => {
    const held = fresh()
    if (held) return held
    // Nobody signed in, and nothing to refresh with: no need to ask.
    if (!token && cookies && !(await cookies.read())) return null
    const renewed = await refresh()
    return renewed?.access_token ?? null
  }

  /** A support session's write the API refused: whoever listens says so, once per refusal. */
  const watchReadOnly = async (response: Response) => {
    if (response.status !== 403 || readOnlyListeners.size === 0) return
    const body = (await response
      .clone()
      .json()
      .catch(() => null)) as unknown
    if (isApiError(body) && body.code === IMPERSONATION_READ_ONLY) {
      for (const listener of [...readOnlyListeners]) listener()
    }
  }

  const api = createApi({
    baseUrl: origins,
    // A support session refreshes before a request too: the refresh is what
    // finds out that it ended.
    getToken:
      options.refreshOnRequest || support
        ? () => (token ? getToken().catch(() => null) : null)
        : fresh,
    fetch: support
      ? async (request) => {
          const response = await baseFetch(request)
          await watchReadOnly(response)
          return response
        }
      : (request) => baseFetch(request),
  })

  const endSupport = async () => {
    await withCredentials(identityUrl('/v1/session/impersonation/end'), { method: 'POST' }).catch(
      () => null,
    )
    supportEnded({ code: 'impersonation_ended' })
  }

  const signOutHere = async () => {
    // Signing out of a support tab ends the support session; the
    // operator's own session, in the other cookie, is never touched.
    if (support) return endSupport()
    await withCredentials(identityUrl('/v1/session/sign-out'), { method: 'POST' }).catch(() => null)
    // Out on this device whatever the network said: the keystore forgets it.
    await cookies?.write(null)
    token = null
  }

  /** The session for the token in hand: the person, their org and what they may do. */
  const load = async (): Promise<Session | null> => {
    if (support && supportEnd) return null
    reason = null
    if (cookies && !(await cookies.read())) {
      token = null
      return null
    }
    const current = await refresh()
    if (!current) return null
    const me = await api.user.GET('/v1/me')
    if (!me.data) throw new Error(`could not load the profile: ${me.response.status}`)
    let membership = me.data.membership
    if (!support && options.orgs && !options.orgs.includes(membership?.org_id ?? '')) {
      // Staff who also belong to a customer org may have landed there: move
      // the session to the platform org, or refuse when they are not staff.
      const moved = await withCredentials(identityUrl('/v1/session/switch'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ org_id: options.orgs[0] }),
      })
      let again = null
      if (moved.ok) {
        hold((await moved.json()) as AccessToken)
        again = await api.user.GET('/v1/me')
      }
      membership = again?.data?.membership
      if (!membership || !options.orgs.includes(membership.org_id)) {
        await signOutHere()
        reason = 'not_staff'
        return null
      }
    }
    let permissions: string[] = []
    if (membership) {
      const config = await api.authorization.GET('/v1/organizations/{org_id}/permissions', {
        params: { path: { org_id: membership.org_id } },
      })
      permissions = config.data?.effective?.[membership.role] ?? []
      if (!support && options.roles && !options.roles.includes(membership.role)) {
        // Valid credentials, wrong app: out again, and the page says why.
        await signOutHere()
        reason = 'not_admin'
        return null
      }
    }
    const user = me.data.user
    const saved = user.preferences
    // The server holds the choice; the device keeps a copy for first paint.
    const preferences: Preferences = saved
      ? {
          theme: saved.theme,
          language: saved.language ?? null,
        }
      : loadPreferences()
    cache?.write(PREFERENCES_KEY, JSON.stringify(preferences))
    return {
      user: {
        id: user.id,
        email: user.email,
        displayName: user.display_name ?? user.name ?? null,
        photoUrl: user.photo_url ?? null,
        preferences,
      },
      permissions,
      ...(membership
        ? {
            membership: {
              orgId: membership.org_id,
              membershipId: membership.id,
              role: membership.role,
            },
          }
        : {}),
      chooseOrganization: current.choose_organization,
      // A support tab is marked whatever the answer said: never shown as
      // the person's own session, and never writable.
      ...(support ? { impersonation: impersonationOf(current, now()) } : {}),
    }
  }

  const sessionSource: SessionSource = {
    load,
    async savePreferences(changes) {
      // A support session changes nothing of the person's: the choice lasts
      // as long as the tab.
      if (support) return
      cache?.write(PREFERENCES_KEY, JSON.stringify({ ...loadPreferences(), ...changes }))
      // On the user, so it follows the person to every device.
      const { error } = await api.user.PATCH('/v1/me/profile', {
        body: {
          ...(changes.theme ? { theme: changes.theme } : {}),
          ...(changes.language !== undefined ? { language: changes.language } : {}),
        },
      })
      if (error) throw new Error('preferences not saved')
    },
    signOut: signOutHere,
    async forget(why) {
      // The server has ended it already: nothing to ask, only to drop.
      if (support) {
        supportEnded({
          code: why?.code ?? IMPERSONATION_ENDED,
          ...(why?.message ? { message: why.message } : {}),
        })
        return
      }
      await cookies?.write(null)
      token = null
      reason = 'signed_out'
    },
  }

  const refusal = async (response: Response): Promise<never> => {
    const body = (await response.json().catch(() => null)) as unknown
    if (isApiError(body)) throw new SignInRefused(body.code, body.message)
    throw new SignInRefused(
      response.status === 429 ? 'signin.throttled' : 'unexpected',
      `The sign-in failed (${response.status}).`,
    )
  }

  const query = (params: Record<string, string>) =>
    Object.entries(params)
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
      .join('&')

  const signIn: SignInClient = {
    async methods(email) {
      const response = await baseFetch(identityUrl(`/v1/sign-in/methods?${query({ email })}`))
      if (!response.ok) return refusal(response)
      const body = (await response.json()) as { method: 'sso' | 'local' }
      return body.method
    },
    ssoStartUrl(email, next, client, codeChallenge) {
      return identityUrl(
        `/v1/sign-in/start?${query({
          email,
          app: options.app,
          next,
          ...(client ? { client } : {}),
          ...(codeChallenge
            ? { code_challenge: codeChallenge, code_challenge_method: 'S256' }
            : {}),
        })}`,
      )
    },
    async exchange(code, verifier) {
      const response = await withCredentials(identityUrl('/v1/sign-in/exchange'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, code_verifier: verifier }),
      })
      if (!response.ok) return refusal(response)
      hold((await response.json()) as AccessToken)
    },
    async local(email, password) {
      const response = await withCredentials(identityUrl('/v1/sign-in/local'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, app: options.app }),
      })
      if (response.status === 202) return { kind: 'mfa', step: (await response.json()) as MfaStep }
      if (!response.ok) return refusal(response)
      hold((await response.json()) as AccessToken)
      return { kind: 'signed-in' }
    },
    async mfa(challengeToken, code) {
      const response = await withCredentials(identityUrl('/v1/sign-in/mfa'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challenge_token: challengeToken, code }),
      })
      if (!response.ok) return refusal(response)
      hold((await response.json()) as AccessToken)
    },
  }

  const account = createAccountClient({
    app: options.app,
    identityOrigin: origins('identity'),
    fetch: withCredentials,
    getToken,
    captchaHeader: CAPTCHA_HEADER,
  })

  const orgs = {
    async list(): Promise<OrgChoice[]> {
      // A support session is one person in one org: nowhere to switch to.
      if (support) return []
      const response = await withCredentials(identityUrl('/v1/session/memberships'))
      if (!response.ok) return []
      const body = (await response.json()) as {
        memberships: {
          org_id: string
          org_name?: string
          role?: string
          status: string
          active: boolean
        }[]
      }
      return body.memberships
        .filter((m) => m.status === 'active')
        .map((m) => ({
          orgId: m.org_id,
          name: m.org_name ?? m.org_id,
          role: m.role ?? 'user',
          active: m.active,
        }))
    },
    async switchTo(orgId: string) {
      if (support) throw new Error('a support session cannot switch organization')
      const response = await withCredentials(identityUrl('/v1/session/switch'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ org_id: orgId }),
      })
      if (!response.ok) throw new Error('switch refused')
      hold((await response.json()) as AccessToken)
    },
  }

  return {
    api,
    sessionSource,
    signIn,
    account,
    orgs,
    getToken,
    eventsUrl: identityUrl(
      support ? '/v1/session/events?impersonation=true' : '/v1/session/events',
    ),
    support: support
      ? {
          ended: () => supportEnd,
          onEnded(listener) {
            endListeners.add(listener)
            return () => void endListeners.delete(listener)
          },
          onReadOnly(listener) {
            readOnlyListeners.add(listener)
            return () => void readOnlyListeners.delete(listener)
          },
          end: endSupport,
        }
      : null,
    reason: () => reason,
  }
}
