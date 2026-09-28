import { describe, expect, it } from 'vitest'

import { createAuth, serviceOrigins, SignInRefused } from './auth'
import { fakeIdentity } from '../test/fake-identity'

describe('serviceOrigins', () => {
  it('is the address named for a service, else the gateway path, else a plain error', () => {
    const named = serviceOrigins(undefined, { identity: 'https://identity.local.test/' })
    expect(named('identity')).toBe('https://identity.local.test')
    expect(() => named('organization')).toThrow(/VITE_API_ORIGIN_ORGANIZATION/)
    const deployed = serviceOrigins('https://api.example.test/', { identity: undefined })
    expect(deployed('identity')).toBe('https://api.example.test/identity')
  })
})

describe('createAuth', () => {
  const origin = 'https://api.example.test'

  it('signs in locally, loads the session, presents and refreshes the token, signs out', async () => {
    const fake = fakeIdentity()
    fake.accounts.set('ada@example.com', {
      email: 'ada@example.com',
      password: 'correct horse',
      membership: { orgId: 'acme', role: 'admin' },
    })
    let clock = 1_000_000
    const auth = createAuth({ app: 'ofis', apiOrigin: origin, fetch: fake.fetch, now: () => clock })

    expect(await auth.sessionSource.load()).toBeNull()
    await expect(auth.signIn.local('ada@example.com', 'wrong')).rejects.toBeInstanceOf(
      SignInRefused,
    )
    await expect(auth.signIn.methods('ada@example.com')).resolves.toBe('local')

    await expect(auth.signIn.local('ada@example.com', 'correct horse')).resolves.toEqual({
      kind: 'signed-in',
    })
    const session = await auth.sessionSource.load()
    expect(session?.user.email).toBe('ada@example.com')
    expect(session?.membership).toEqual({
      orgId: 'acme',
      membershipId: 'm-ada@example.com',
      role: 'admin',
    })
    expect(session?.permissions).toEqual(['users'])
    expect(session?.chooseOrganization).toBe(false)

    // The token is presented as long as it is fresh, then refreshed once.
    const refreshes = () => fake.calls.filter((c) => c.endsWith('/session/refresh')).length
    const before = refreshes()
    expect(await auth.getToken()).toBe('token-for-ada@example.com')
    expect(refreshes()).toBe(before)
    clock += 15 * 60 * 1000
    expect(await auth.getToken()).toBe('token-for-ada@example.com')
    expect(refreshes()).toBe(before + 1)

    await auth.sessionSource.signOut()
    expect(fake.signedIn).toBe(false)
    expect(await auth.sessionSource.load()).toBeNull()
  })

  it('tells the admin app to refuse a plain User, and signs them out again', async () => {
    const fake = fakeIdentity()
    fake.accounts.set('u@example.com', {
      email: 'u@example.com',
      password: 'a long password',
      membership: { orgId: 'acme', role: 'user' },
    })
    const auth = createAuth({
      app: 'admin',
      apiOrigin: origin,
      fetch: fake.fetch,
      roles: ['owner', 'admin', 'billing_admin'],
    })
    await auth.signIn.local('u@example.com', 'a long password')
    expect(await auth.sessionSource.load()).toBeNull()
    expect(auth.reason()).toBe('not_admin')
    expect(fake.signedIn).toBe(false)
  })

  it('parks a sign-in at the second factor and finishes it with the code', async () => {
    const fake = fakeIdentity()
    fake.accounts.set('m@example.com', {
      email: 'm@example.com',
      password: 'a long password',
      mfaCode: '123456',
      membership: { orgId: 'acme', role: 'user' },
    })
    const auth = createAuth({ app: 'ofis', apiOrigin: origin, fetch: fake.fetch })
    const result = await auth.signIn.local('m@example.com', 'a long password')
    expect(result.kind).toBe('mfa')
    const challenge = result.kind === 'mfa' ? result.step.challenge_token! : ''
    await expect(auth.signIn.mfa(challenge, '000000')).rejects.toMatchObject({
      code: 'mfa.code_invalid',
    })
    await auth.signIn.mfa(challenge, '123456')
    expect((await auth.sessionSource.load())?.user.email).toBe('m@example.com')
  })

  it('points an Entra domain at the provider, with the app and where to return', async () => {
    const fake = fakeIdentity()
    fake.entraDomains.add('acme.com')
    const auth = createAuth({ app: 'admin', apiOrigin: origin, fetch: fake.fetch })
    await expect(auth.signIn.methods('ada@acme.com')).resolves.toBe('entra')
    const url = new URL(auth.signIn.entraStartUrl('ada@acme.com', '/users'))
    expect(url.origin + url.pathname).toBe(`${origin}/identity/v1/sign-in/start`)
    expect(url.searchParams.get('app')).toBe('admin')
    expect(url.searchParams.get('next')).toBe('/users')
    expect(url.searchParams.has('client')).toBe(false)
    const desktop = new URL(auth.signIn.entraStartUrl('ada@acme.com', '/users', 'desktop'))
    expect(desktop.searchParams.get('client')).toBe('desktop')
  })

  it('finishes a desktop sign-in with the one-time code and its verifier, once', async () => {
    const fake = fakeIdentity()
    fake.accounts.set('ada@acme.com', {
      email: 'ada@acme.com',
      password: 'unused',
      membership: { orgId: 'acme', role: 'user' },
    })
    fake.desktopCodes.set('code-1', { email: 'ada@acme.com', verifier: 'v-1' })
    const auth = createAuth({ app: 'ofis', apiOrigin: origin, fetch: fake.fetch })
    await expect(auth.signIn.exchange('code-1', 'wrong')).rejects.toMatchObject({
      code: 'signin.exchange_invalid',
    })
    fake.desktopCodes.set('code-2', { email: 'ada@acme.com', verifier: 'v-2' })
    await auth.signIn.exchange('code-2', 'v-2')
    expect(await auth.getToken()).toBe('token-for-ada@acme.com')
    expect((await auth.sessionSource.load())?.user.email).toBe('ada@acme.com')
    await expect(auth.signIn.exchange('code-2', 'v-2')).rejects.toBeInstanceOf(SignInRefused)
  })
})
