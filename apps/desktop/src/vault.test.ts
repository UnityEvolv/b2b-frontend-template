import { describe, expect, it } from 'vitest'

import {
  isIdentityRequest,
  mergeCookieHeader,
  readSetCookie,
  SessionVault,
  type VaultCrypto,
  type VaultFile,
} from './vault'

/** A disk and a keychain in memory; the "encryption" is visible on purpose. */
function fakes(available = true) {
  let stored: Buffer | null = null
  const file: VaultFile & { stored(): Buffer | null } = {
    read: () => stored,
    write: (data) => {
      stored = data
    },
    remove: () => {
      stored = null
    },
    stored: () => stored,
  }
  const crypto: VaultCrypto = {
    available: () => available,
    encrypt: (text) => Buffer.from(`enc:${text}`),
    decrypt: (data) => {
      const text = data.toString()
      if (!text.startsWith('enc:')) throw new Error('not ours')
      return text.slice(4)
    },
  }
  return { file, crypto }
}

describe('reading the identity service’s cookies', () => {
  it('reads name, value and expiry, Max-Age over Expires', () => {
    expect(readSetCookie('b2bapp_session=abc; Path=/; HttpOnly; Max-Age=60', 1000)).toEqual({
      name: 'b2bapp_session',
      value: 'abc',
      expiresAt: 61_000,
    })
    expect(readSetCookie('b2bapp_session=; Max-Age=0', 1000)?.expiresAt).toBe(0)
    expect(
      readSetCookie('a=b; Expires=Wed, 21 Oct 2037 07:28:00 GMT; Max-Age=10', 0)?.expiresAt,
    ).toBe(10_000)
    expect(readSetCookie('a=b; Expires=Wed, 21 Oct 2037 07:28:00 GMT', 0)?.expiresAt).toBe(
      Date.parse('Wed, 21 Oct 2037 07:28:00 GMT'),
    )
    expect(readSetCookie('a=b', 0)?.expiresAt).toBeNull()
    expect(readSetCookie('garbage', 0)).toBeNull()
    expect(readSetCookie('=x', 0)).toBeNull()
  })

  it('knows which requests go to the identity service', () => {
    const id = 'https://api.example.test/identity'
    expect(isIdentityRequest(`${id}/v1/session/refresh`, id)).toBe(true)
    expect(isIdentityRequest('https://api.example.test/identityx/v1', id)).toBe(false)
    expect(isIdentityRequest('https://api.example.test/user/v1/me', id)).toBe(false)
    expect(isIdentityRequest('https://other.example.test/identity/v1', id)).toBe(false)
    expect(
      isIdentityRequest('http://localhost:8093/v1/session/refresh', 'http://localhost:8093'),
    ).toBe(true)
    expect(isIdentityRequest('http://localhost:8094/v1', 'http://localhost:8093')).toBe(false)
    expect(isIdentityRequest(`${id}/v1`, null)).toBe(false)
  })

  it('puts the kept cookies over what a request already carried', () => {
    expect(mergeCookieHeader('a=1; b2bapp_session=old', { b2bapp_session: 'new' })).toBe(
      'a=1; b2bapp_session=new',
    )
    expect(mergeCookieHeader(undefined, { b2bapp_session: 'x' })).toBe('b2bapp_session=x')
  })
})

describe('the session in the keychain', () => {
  it('keeps what was set, encrypted, and has it again after a restart', () => {
    const { file, crypto } = fakes()
    let clock = 1000
    const vault = new SessionVault(file, crypto, () => clock)
    vault.remember(['b2bapp_session=s1; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=3600'])
    expect(vault.cookies()).toEqual({ b2bapp_session: 's1' })
    expect(file.stored()?.toString()).toMatch(/^enc:/)

    const again = new SessionVault(file, crypto, () => clock)
    again.load()
    expect(again.cookies()).toEqual({ b2bapp_session: 's1' })

    // A rotation replaces it; expiry drops it.
    again.remember(['b2bapp_session=s2; Max-Age=10'])
    expect(again.cookies()).toEqual({ b2bapp_session: 's2' })
    clock += 11_000
    expect(again.cookies()).toEqual({})
    const later = new SessionVault(file, crypto, () => clock)
    later.load()
    expect(later.cookies()).toEqual({})
  })

  it('forgets on sign-out, which clears the cookie, and on forget', () => {
    const { file, crypto } = fakes()
    const vault = new SessionVault(file, crypto)
    vault.remember(['b2bapp_session=s1; Max-Age=3600'])
    vault.remember(['b2bapp_session=; Path=/; Max-Age=0'])
    expect(vault.cookies()).toEqual({})
    expect(file.stored()).toBeNull()

    vault.remember(['b2bapp_session=s1; Max-Age=3600'])
    vault.forget()
    expect(vault.cookies()).toEqual({})
    expect(file.stored()).toBeNull()
  })

  it('writes nothing to disk without a keychain, and drops a file it cannot read', () => {
    const none = fakes(false)
    const vault = new SessionVault(none.file, none.crypto)
    vault.remember(['b2bapp_session=s1; Max-Age=3600'])
    expect(vault.cookies()).toEqual({ b2bapp_session: 's1' })
    expect(none.file.stored()).toBeNull()

    const bad = fakes()
    bad.file.write(Buffer.from('tampered'))
    const reader = new SessionVault(bad.file, bad.crypto)
    reader.load()
    expect(reader.cookies()).toEqual({})
    expect(bad.file.stored()).toBeNull()
  })
})
