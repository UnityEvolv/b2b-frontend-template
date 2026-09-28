import { describe, expect, it } from 'vitest'

import { deepLinkFrom, parseDeepLink, safePath } from './deeplink'

const S = 'b2bapp'

describe('links into the app', () => {
  it('opens the pages an email points at, with their query', () => {
    expect(parseDeepLink(`${S}://accept-invite?token=abc`, S)).toEqual({
      kind: 'open',
      path: '/accept-invite?token=abc',
    })
    expect(parseDeepLink(`${S}:///reset-password?token=t1`, S)).toEqual({
      kind: 'open',
      path: '/reset-password?token=t1',
    })
    expect(parseDeepLink(`${S}://set-password?token=t`, S)?.kind).toBe('open')
    expect(parseDeepLink(`${S}://verify-email?token=t`, S)?.kind).toBe('open')
    expect(parseDeepLink(`${S}://verify-email/`, S)).toEqual({
      kind: 'open',
      path: '/verify-email',
    })
  })

  it('opens nothing else: other pages, other schemes, tricks', () => {
    expect(parseDeepLink(`${S}://profile`, S)).toBeNull()
    expect(parseDeepLink(`${S}://settings/security`, S)).toBeNull()
    expect(parseDeepLink(`${S}://verify-email/a`, S)).toBeNull()
    // Dot segments are resolved first: they never climb out of the page named.
    expect(parseDeepLink(`${S}://verify-email/../../etc`, S)).toBeNull()
    expect(parseDeepLink(`${S}:///accept-invite/../settings`, S)).toBeNull()
    expect(parseDeepLink('https://example.test/accept-invite', S)).toBeNull()
    expect(parseDeepLink('other://accept-invite', S)).toBeNull()
    expect(parseDeepLink('not a link', S)).toBeNull()
    expect(parseDeepLink(`${S}://accept-invite?x=${'a'.repeat(5000)}`, S)).toBeNull()
  })

  it('reads the end of a sign-in in the browser', () => {
    expect(parseDeepLink(`${S}://auth/callback?code=c0de-1&next=%2Fprofile`, S)).toEqual({
      kind: 'sign-in',
      code: 'c0de-1',
      error: null,
      next: '/profile',
    })
    expect(parseDeepLink(`${S}://auth/callback?error=provider_refused`, S)).toEqual({
      kind: 'sign-in',
      code: null,
      error: 'provider_refused',
      next: '/',
    })
    // Another origin is never where it returns to.
    expect(parseDeepLink(`${S}://auth/callback?code=c&next=%2F%2Fevil.example`, S)).toMatchObject({
      next: '/',
    })
    expect(parseDeepLink(`${S}://auth/callback?code=%3Cscript%3E`, S)).toMatchObject({
      code: null,
    })
  })

  it('finds the link on a command line, and keeps a next path inside the app', () => {
    expect(deepLinkFrom(['app.exe', '--flag', `${S}://verify-email?token=x`], S)).toBe(
      `${S}://verify-email?token=x`,
    )
    expect(deepLinkFrom(['app.exe'], S)).toBeNull()
    expect(safePath('/settings/notifications?x=1')).toBe('/settings/notifications?x=1')
    expect(safePath('https://evil.example')).toBe('/')
    expect(safePath('/\\evil')).toBe('/')
  })
})
