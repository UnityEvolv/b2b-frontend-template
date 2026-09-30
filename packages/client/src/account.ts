import { isApiError } from '@b2b-template/api'

import type { AuthApp } from './auth'
import { SignInRefused } from './errors'

/**
 * The account flows around sign-in: following an
 * invite, proving an address, setting or resetting a password, and the
 * second factor. All against the identity service; the pages call these and
 * nothing else.
 */

export interface InvitePreview {
  org_id: string
  org_name: string
  role: string
  expires_at: string
  email_hint?: string
}

export interface InviteAccepted {
  org_id: string
  membership_id: string
  user_id: string
  next: 'sign_in_sso' | 'verify_email' | 'sign_in'
}

export interface EmailVerified {
  user_id: string
  org_id: string
  setup_token?: string
}

export interface TotpEnrolment {
  secret: string
  otpauth_uri: string
}

export interface MfaStatus {
  enrolled: boolean
  confirmed_at?: string
  recovery_codes_left?: number
  required: boolean
}

export interface AccountClient {
  invitePreview(token: string): Promise<InvitePreview>
  acceptInvite(token: string, name?: string): Promise<InviteAccepted>
  verifyEmail(token: string): Promise<EmailVerified>
  resendVerification(email: string): Promise<void>
  setPassword(token: string, password: string): Promise<void>
  forgotPassword(email: string, captchaToken?: string | null): Promise<void>
  /** The org the session moves to, after accepting an invite while signed in. */
  switchOrganization(orgId: string): Promise<void>
  /** Enrolment demanded at sign-in, with the token the sign-in answered with. */
  enrolAtSignIn(enrollmentToken: string): Promise<TotpEnrolment>
  confirmAtSignIn(enrollmentToken: string, code: string): Promise<string[]>
  /** The signed-in person's second factor. */
  mfaStatus(): Promise<MfaStatus>
  enrol(): Promise<TotpEnrolment>
  confirm(code: string): Promise<string[]>
  regenerateRecoveryCodes(code: string): Promise<string[]>
  disableMfa(code: string): Promise<void>
}

export interface AccountClientOptions {
  app: AuthApp
  identityOrigin: string
  /**
   * The identity service's transport. It carries the session cookie: the
   * browser's own on web, the one kept in the keystore on mobile.
   */
  fetch: typeof globalThis.fetch
  getToken: () => Promise<string | null>
  captchaHeader: string
}

export function createAccountClient(options: AccountClientOptions): AccountClient {
  const url = (path: string) => `${options.identityOrigin}${path}`

  const refusal = async (response: Response): Promise<never> => {
    const body = (await response.json().catch(() => null)) as unknown
    if (isApiError(body)) throw new SignInRefused(body.code, body.message)
    throw new SignInRefused(
      response.status === 429 ? 'signin.throttled' : 'unexpected',
      `The request failed (${response.status}).`,
    )
  }

  /** A public call: the session cookie goes along, for the ones that set it. */
  const call = async <T>(
    method: string,
    path: string,
    body?: unknown,
    extra: Record<string, string> = {},
  ): Promise<T> => {
    const response = await options.fetch(url(path), {
      method,
      headers: { ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...extra },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    })
    if (!response.ok) return refusal(response)
    if (response.status === 204 || response.status === 202) return undefined as T
    return (await response.json()) as T
  }

  /** A signed-in call, with the bearer token. */
  const signedIn = async <T>(method: string, path: string, body?: unknown): Promise<T> => {
    const token = await options.getToken()
    if (!token) throw new SignInRefused('session.none', 'Not signed in.')
    return call<T>(method, path, body, { Authorization: `Bearer ${token}` })
  }

  return {
    invitePreview: (token) => call('GET', `/v1/invites/${encodeURIComponent(token)}`),
    acceptInvite: (token, name) =>
      call('POST', `/v1/invites/${encodeURIComponent(token)}/accept`, name ? { name } : {}),
    verifyEmail: (token) => call('POST', '/v1/email-verification/verify', { token }),
    resendVerification: (email) =>
      call('POST', '/v1/email-verification/resend', { email, app: options.app }),
    setPassword: (token, password) => call('POST', '/v1/local/password', { token, password }),
    forgotPassword: (email, captchaToken) =>
      call(
        'POST',
        '/v1/local/password/forgot',
        { email, app: options.app },
        captchaToken ? { [options.captchaHeader]: captchaToken } : {},
      ),
    switchOrganization: (orgId) => call('POST', '/v1/session/switch', { org_id: orgId }),
    enrolAtSignIn: (enrollmentToken) =>
      call('POST', '/v1/sign-in/mfa/enroll', { enrollment_token: enrollmentToken }),
    confirmAtSignIn: async (enrollmentToken, code) =>
      (
        await call<{ recovery_codes: string[] }>('POST', '/v1/sign-in/mfa/confirm', {
          enrollment_token: enrollmentToken,
          code,
        })
      ).recovery_codes,
    mfaStatus: () => signedIn('GET', '/v1/mfa'),
    enrol: () => signedIn('POST', '/v1/mfa/totp'),
    confirm: async (code) =>
      (await signedIn<{ recovery_codes: string[] }>('POST', '/v1/mfa/totp/confirm', { code }))
        .recovery_codes,
    regenerateRecoveryCodes: async (code) =>
      (await signedIn<{ recovery_codes: string[] }>('POST', '/v1/mfa/recovery-codes', { code }))
        .recovery_codes,
    disableMfa: (code) => signedIn('DELETE', '/v1/mfa', { code }),
  }
}
