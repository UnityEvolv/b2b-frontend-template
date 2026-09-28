import { createHash, randomBytes } from 'node:crypto'
import { describe, expect, it } from 'vitest'

import { ATTEMPT_TTL_MS, PendingSignIn, pkcePair, systemSignInUrl } from './signin'

const IDENTITY = 'https://api.example.test/identity'
const sha256 = (text: string) => createHash('sha256').update(text).digest()

describe('sign-in in the browser', () => {
  it('makes an S256 PKCE pair', () => {
    const { verifier, challenge } = pkcePair(randomBytes, sha256)
    expect(verifier).toMatch(/^[A-Za-z0-9_-]{43}$/)
    expect(challenge).toBe(sha256(verifier).toString('base64url'))
    // RFC 7636 appendix B.
    const known = pkcePair(
      () =>
        Uint8Array.from([
          116, 24, 223, 180, 151, 153, 224, 37, 79, 250, 96, 125, 216, 173, 187, 186, 22, 212, 37,
          77, 105, 214, 191, 240, 91, 88, 5, 88, 83, 132, 141, 121,
        ]),
      sha256,
    )
    expect(known).toEqual({
      verifier: 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk',
      challenge: 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM',
    })
  })

  it('opens only the identity service’s sign-in start, with the desktop’s part added', () => {
    const url = new URL(
      systemSignInUrl(
        `${IDENTITY}/v1/sign-in/start?email=a%40acme.com&app=account&next=%2Fprofile`,
        IDENTITY,
        'chal',
      )!,
    )
    expect(url.origin + url.pathname).toBe(`${IDENTITY}/v1/sign-in/start`)
    expect(url.searchParams.get('email')).toBe('a@acme.com')
    expect(url.searchParams.get('next')).toBe('/profile')
    expect(url.searchParams.get('client')).toBe('desktop')
    expect(url.searchParams.get('code_challenge')).toBe('chal')
    expect(url.searchParams.get('code_challenge_method')).toBe('S256')

    expect(systemSignInUrl('https://evil.example/v1/sign-in/start', IDENTITY, 'c')).toBeNull()
    expect(systemSignInUrl(`${IDENTITY}/v1/session/refresh`, IDENTITY, 'c')).toBeNull()
    expect(systemSignInUrl('file:///etc/passwd', IDENTITY, 'c')).toBeNull()
    expect(systemSignInUrl(42, IDENTITY, 'c')).toBeNull()
    expect(systemSignInUrl(`${IDENTITY}/v1/sign-in/start`, null, 'c')).toBeNull()
  })

  it('hands the verifier out once, and not after the attempt went stale', () => {
    let clock = 0
    const pending = new PendingSignIn(() => clock)
    expect(pending.take()).toBeNull()
    pending.begin('v1')
    expect(pending.take()).toBe('v1')
    expect(pending.take()).toBeNull()
    pending.begin('v2')
    clock += ATTEMPT_TTL_MS + 1
    expect(pending.take()).toBeNull()
  })
})
