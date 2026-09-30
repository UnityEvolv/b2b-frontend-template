/**
 * The identity, user and authorization services in memory, answering the
 * calls sign-in and the session make. A test sets who exists and watches
 * what was asked.
 */
export interface FakeAccount {
  email: string
  password: string
  /** The org the person lands in, with their role; none means the chooser. */
  membership?: { orgId: string; role: string }
  /** A six-digit code the app would show; the sign-in parks until it is typed. */
  mfaCode?: string
  /** The org requires an authenticator the person does not have. */
  mustEnroll?: boolean
  verified?: boolean
}

export interface FakeIdentity {
  fetch: typeof globalThis.fetch
  /** Which domains have a provider. */
  entraDomains: Set<string>
  accounts: Map<string, FakeAccount>
  /** Whether a session cookie is "set". */
  signedIn: boolean
  calls: string[]
  /** Fail the next refresh with a network error. */
  offline: boolean
  /** Invite tokens: open, used, expired. */
  invites: Map<string, { status: 'open' | 'used' | 'expired'; email: string; next: string }>
  /** Setup and reset tokens that set a password. */
  passwordTokens: Set<string>
  /** What was sent to the forgot endpoint. */
  forgot: string[]
  /** One-time codes a sign-in in the browser handed the desktop app, with who and the verifier. */
  desktopCodes: Map<string, { email: string; verifier: string }>
}

export function fakeIdentity(): FakeIdentity {
  const state: FakeIdentity = {
    entraDomains: new Set(),
    accounts: new Map(),
    signedIn: false,
    calls: [],
    offline: false,
    invites: new Map(),
    passwordTokens: new Set(),
    forgot: [],
    desktopCodes: new Map(),
    fetch: async () => new Response(null, { status: 500 }),
  }
  let current: FakeAccount | null = null
  const challenges = new Map<string, FakeAccount>()

  const json = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
  const refused = (status: number, code: string) => json(status, { code, message: code })
  const token = (account: FakeAccount) => ({
    access_token: `token-for-${account.email}`,
    token_type: 'Bearer',
    expires_in: 900,
    user_id: `user-${account.email}`,
    ...(account.membership
      ? { org_id: account.membership.orgId, membership_id: `m-${account.email}` }
      : {}),
    choose_organization: !account.membership,
  })

  state.fetch = async (input, init) => {
    const url = new URL(
      typeof input === 'string' ? input : input instanceof URL ? input.href : input.url,
    )
    const method = init?.method ?? (input instanceof Request ? input.method : 'GET')
    state.calls.push(`${method} ${url.pathname}`)
    const body = init?.body ? (JSON.parse(String(init.body)) as Record<string, string>) : {}
    if (state.offline) throw new TypeError('offline')

    switch (`${method} ${url.pathname}`) {
      case 'GET /identity/v1/sign-in/methods': {
        const email = url.searchParams.get('email') ?? ''
        if (!email.includes('@')) return refused(400, 'invalid_request')
        return json(200, {
          method: state.entraDomains.has(email.split('@')[1] ?? '') ? 'entra' : 'local',
        })
      }
      case 'POST /identity/v1/sign-in/local': {
        const account = state.accounts.get(body.email ?? '')
        if (!account || account.password !== body.password)
          return refused(401, 'credentials.invalid')
        if (account.verified === false) return refused(401, 'local_account.unverified')
        if (!account.membership && !account.mustEnroll && account.email.startsWith('nobody'))
          return refused(401, 'session.no_membership')
        if (account.mustEnroll)
          return json(202, { mfa: 'enroll', enrollment_token: 'enrol-me', expires_in: 900 })
        if (account.mfaCode) {
          const challenge = `challenge-${account.email}`
          challenges.set(challenge, account)
          return json(202, { mfa: 'challenge', challenge_token: challenge, expires_in: 300 })
        }
        current = account
        state.signedIn = true
        return json(200, token(account))
      }
      case 'POST /identity/v1/sign-in/mfa': {
        const account = challenges.get(body.challenge_token ?? '')
        if (!account) return refused(401, 'mfa.challenge_expired')
        if (account.mfaCode !== body.code) return refused(401, 'mfa.code_invalid')
        challenges.delete(body.challenge_token ?? '')
        current = account
        state.signedIn = true
        return json(200, token(account))
      }
      case 'POST /identity/v1/sign-in/exchange': {
        // The desktop app's one-time code, redeemed once with its verifier.
        const handed = state.desktopCodes.get(body.code ?? '')
        state.desktopCodes.delete(body.code ?? '')
        const account = handed ? state.accounts.get(handed.email) : undefined
        if (!handed || !account || handed.verifier !== body.code_verifier)
          return refused(400, 'signin.exchange_invalid')
        current = account
        state.signedIn = true
        return json(200, token(account))
      }
      case 'POST /identity/v1/session/refresh':
        if (!state.signedIn || !current) return refused(401, 'session.none')
        return json(200, token(current))
      case 'POST /identity/v1/session/sign-out':
        state.signedIn = false
        current = null
        return new Response(null, { status: 204 })
      case 'GET /user/v1/me': {
        if (!current) return refused(401, 'unauthenticated')
        const user = {
          id: `user-${current.email}`,
          email: current.email,
          name: 'Ada Lovelace',
          created_at: '2026-01-01T00:00:00Z',
        }
        return json(200, {
          user,
          ...(current.membership
            ? {
                membership: {
                  id: `m-${current.email}`,
                  org_id: current.membership.orgId,
                  role: current.membership.role,
                  status: 'active',
                  kind: 'member',
                  source: 'invite',
                  user,
                  directory: {},
                  created_at: user.created_at,
                  last_modified_at: user.created_at,
                },
              }
            : {}),
        })
      }
      case 'POST /identity/v1/local/password':
        if (!state.passwordTokens.has(body.token ?? ''))
          return refused(400, 'email_verification.invalid')
        if ((body.password ?? '').length < 12) return refused(400, 'password.policy')
        state.passwordTokens.delete(body.token ?? '')
        return new Response(null, { status: 204 })
      case 'POST /identity/v1/local/password/forgot':
        state.forgot.push(body.email ?? '')
        return new Response(null, { status: 202 })
      case 'POST /identity/v1/email-verification/verify':
        if (body.token !== 'verify-ok') return refused(400, 'email_verification.invalid')
        state.passwordTokens.add('setup-1')
        return json(200, { user_id: 'u', org_id: 'acme', setup_token: 'setup-1' })
      default:
        {
          const invite = /^\/identity\/v1\/invites\/([^/]+)(\/accept)?$/.exec(url.pathname)
          if (invite) {
            const found = state.invites.get(decodeURIComponent(invite[1]!))
            if (!found) return refused(404, 'invite.not_found')
            if (found.status === 'used') return refused(404, 'invite.used')
            if (found.status === 'expired') return refused(404, 'invite.expired')
            if (!invite[2]) {
              const at = found.email.lastIndexOf('@')
              return json(200, {
                org_id: 'acme',
                org_name: 'Acme',
                kind: 'member',
                role: 'user',
                expires_at: '2030-01-01T00:00:00Z',
                email_hint: found.email[0] + '***' + found.email.slice(at),
              })
            }
            found.status = 'used'
            return json(200, {
              org_id: 'acme',
              membership_id: 'm',
              user_id: 'user-' + found.email,
              next: found.next,
            })
          }
        }
        if (
          method === 'GET' &&
          /^\/authorization\/v1\/organizations\/[^/]+\/permissions$/.test(url.pathname)
        ) {
          return json(200, {
            org_id: 'o',
            admin: ['users'],
            billing_admin: ['billing'],
            warnings: [],
            effective: {
              owner: ['users', 'billing', 'audit'],
              admin: ['users'],
              billing_admin: ['billing'],
              user: [],
              guest: [],
            },
          })
        }
        return refused(404, 'not_found')
    }
  }
  return state
}
