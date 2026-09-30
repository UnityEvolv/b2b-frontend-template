import type { SignInClient } from '@b2b-template/client'
import * as Crypto from 'expo-crypto'
import * as WebBrowser from 'expo-web-browser'

import { base64Url, SIGN_IN_RETURN, signInReturn, verifierFrom } from '../links'

/**
 * Signing in through an organization's provider on the phone, the
 * same hand-off as the desktop app's: the system browser, never a
 * webview inside the app, so the person types their password into their
 * provider's page in the browser they trust and the app never sees it. The
 * start says `client=mobile` with a PKCE challenge; the identity service
 * sends the browser back to `<scheme>://auth/callback` with a one-time
 * code, and the app trades it with the verifier only it holds.
 */
export type EntraOutcome =
  | { kind: 'signed-in'; next: string | null }
  | { kind: 'cancelled' }
  /** The callback's error code, for the sign-in page's table. */
  | { kind: 'refused'; code: string }

export async function signInWithProvider(
  signIn: SignInClient,
  email: string,
  next = '/',
): Promise<EntraOutcome> {
  const verifier = verifierFrom(Crypto.getRandomBytes(64))
  const digest = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, verifier, {
    encoding: Crypto.CryptoEncoding.BASE64,
  })
  const start = signIn.entraStartUrl(email, next, 'mobile', base64Url(digest))
  const result = await WebBrowser.openAuthSessionAsync(start, SIGN_IN_RETURN, {
    // A fresh session each time: another person's cookie at their provider
    // must never sign this one in.
    preferEphemeralSession: true,
    showInRecents: false,
  })
  if (result.type !== 'success') return { kind: 'cancelled' }
  const back = signInReturn(result.url)
  if (back.kind === 'error') return { kind: 'refused', code: back.error }
  if (back.kind !== 'code') return { kind: 'refused', code: 'attempt_expired' }
  try {
    await signIn.exchange(back.code, verifier)
  } catch {
    return { kind: 'refused', code: 'exchange_invalid' }
  }
  return { kind: 'signed-in', next: back.next }
}
