import { describe, expect, it } from 'vitest'

import { base64Url, parseLink, signInReturn, verifierFrom } from './links'

describe('reading a link the app was opened with', () => {
  it('reads an app link and a web link the same way', () => {
    expect(parseLink('b2bapp://accept-invite?token=a%2Bb&x=1')).toEqual({
      path: 'accept-invite',
      params: { token: 'a+b', x: '1' },
    })
    expect(parseLink('https://app.example.test/reset-password?token=t')).toEqual({
      path: 'reset-password',
      params: { token: 't' },
    })
    expect(parseLink('b2bapp://auth/callback/')).toEqual({ path: 'auth/callback', params: {} })
    expect(parseLink('nonsense')).toBeNull()
  })

  it('tells a sign-in code from a refusal', () => {
    expect(signInReturn('b2bapp://auth/callback?code=abc&next=%2Fprofile')).toEqual({
      kind: 'code',
      code: 'abc',
      next: '/profile',
    })
    expect(signInReturn('b2bapp://auth/callback?code=abc&next=%2F%2Fevil.example')).toEqual({
      kind: 'code',
      code: 'abc',
      next: null,
    })
    expect(signInReturn('b2bapp://accept-invite?code=abc')).toEqual({ kind: 'unknown' })
    expect(signInReturn('b2bapp://auth/callback?error=provider_refused')).toEqual({
      kind: 'error',
      error: 'provider_refused',
    })
    expect(signInReturn('b2bapp://auth/callback')).toEqual({ kind: 'unknown' })
  })

  it('makes a PKCE verifier and challenge in the right alphabet', () => {
    const verifier = verifierFrom(new Uint8Array(64).map((_, i) => i * 7))
    expect(verifier).toMatch(/^[A-Za-z0-9._~-]{64}$/)
    expect(base64Url('ab+/cd==')).toBe('ab-_cd')
  })
})
