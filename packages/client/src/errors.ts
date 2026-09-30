/**
 * Why the identity service said no, and which sentence each page shows for
 * it. The codes are the API's and stable; the values are translation keys
 * under the page's own heading (`signIn.errors.*`, `invite.errors.*`, …),
 * so web and mobile explain the same refusal in the same words.
 */

/** Why a sign-in or an account call was refused, as the API's error code. */
export class SignInRefused extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message)
  }
}

/** The refusal's key in a page's table, or `unexpected` for anything else. */
export function refusalKey(error: unknown, known: Readonly<Record<string, string>>): string {
  if (error instanceof SignInRefused) return known[error.code] ?? 'unexpected'
  return 'unexpected'
}

/** The error codes the identity provider's callback sends the sign-in page back with. */
export const CALLBACK_ERRORS: Readonly<Record<string, string>> = {
  provider_refused: 'providerRefused',
  attempt_expired: 'attemptExpired',
  membership_inactive: 'inactive',
  plan_limit: 'planLimit',
  no_membership: 'noMembership',
  organization_suspended: 'orgSuspended',
  organization_closing: 'orgClosing',
  // An app's hand-off: the code was refused, or never came.
  exchange_invalid: 'attemptExpired',
}

/** Sign-in refusals, as the sign-in page explains them (`signIn.errors.*`). */
export const SIGN_IN_ERRORS: Readonly<Record<string, string>> = {
  'credentials.invalid': 'credentials',
  'local_account.unverified': 'unverified',
  'session.no_membership': 'noMembership',
  'organization.suspended': 'orgSuspended',
  'organization.closing': 'orgClosing',
  'signin.throttled': 'throttled',
  'mfa.code_invalid': 'codeInvalid',
  'mfa.challenge_expired': 'attemptExpired',
  'signin.exchange_invalid': 'attemptExpired',
}

/** Invite refusals (`invite.errors.*`). */
export const INVITE_ERRORS: Readonly<Record<string, string>> = {
  'invite.not_found': 'invalid',
  'invite.used': 'used',
  'invite.revoked': 'revoked',
  'invite.expired': 'expired',
  'plan.limit_reached': 'planLimit',
}

/** A verification link that did not work (`password.errors.*`). */
export const VERIFY_ERRORS: Readonly<Record<string, string>> = {
  'email_verification.invalid': 'invalidLink',
}

/** Setting a password from a link (`password.errors.*`). */
export const PASSWORD_ERRORS: Readonly<Record<string, string>> = {
  'email_verification.invalid': 'invalidLink',
  'password.policy': 'policy',
}

/** Asking for a reset link (`password.errors.*`). */
export const FORGOT_ERRORS: Readonly<Record<string, string>> = {
  'captcha.failed': 'captcha',
  'captcha.required': 'captcha',
}

/** The second factor (`mfa.errors.*`). */
export const MFA_ERRORS: Readonly<Record<string, string>> = {
  'mfa.code_invalid': 'codeInvalid',
  'mfa.challenge_expired': 'expired',
  'mfa.not_enrolled': 'notEnrolled',
  'mfa.already_enrolled': 'alreadyEnrolled',
  'mfa.local_accounts_only': 'localOnly',
  'mfa.required_by_organization': 'required',
}
