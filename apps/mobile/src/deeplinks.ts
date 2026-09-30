import { parseLink } from './links'

/**
 * What a link the app was opened with asks for. The same link as
 * the email's web address: `https://<web app host>/accept-invite?token=…`
 * through Android's app links, or `<scheme>://accept-invite?token=…`.
 */
export type LinkTarget =
  | { kind: 'invite'; token: string }
  | { kind: 'verify-email'; token: string }
  | { kind: 'set-password'; token: string }
  | { kind: 'mfa-setup'; token: string }

export function linkTarget(url: string | null | undefined): LinkTarget | null {
  if (!url) return null
  const link = parseLink(url)
  if (!link) return null
  // An empty token is still a link to the page: the page says it is not valid.
  const token = link.params.token ?? ''
  switch (link.path) {
    case 'accept-invite':
      return { kind: 'invite', token }
    case 'verify-email':
      return { kind: 'verify-email', token }
    case 'set-password':
    case 'reset-password':
      return { kind: 'set-password', token }
    case 'mfa/setup':
      return { kind: 'mfa-setup', token }
    default:
      // The sign-in callback is the browser's to deliver, and anything else
      // is not a page the phone has.
      return null
  }
}
