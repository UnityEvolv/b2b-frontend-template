/**
 * The password policy as a person types. The server's rule
 * is length and not the address; length is what can be shown as it grows,
 * and the server refuses the rest on its own.
 */

export const PASSWORD_MIN = 12
export const PASSWORD_MAX = 200

export interface PasswordRule {
  /** The key under `password.rules`. */
  key: 'length' | 'match'
  ok: boolean
}

export function passwordRules(password: string, confirm: string): PasswordRule[] {
  return [
    { key: 'length', ok: password.length >= PASSWORD_MIN && password.length <= PASSWORD_MAX },
    { key: 'match', ok: password.length > 0 && password === confirm },
  ]
}

/** Whether the form may be sent. */
export function passwordAcceptable(password: string, confirm: string): boolean {
  return passwordRules(password, confirm).every((rule) => rule.ok)
}

/** An address as an invite preview hides it: a***@example.com. */
export function maskEmail(address: string): string {
  const at = address.lastIndexOf('@')
  if (at < 1) return '***'
  return `${address[0]}***${address.slice(at)}`
}

/** A path inside the app, never another origin. */
export function safeNext(next: string | null | undefined, home: string): string {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.includes('\\')) return home
  return next
}
