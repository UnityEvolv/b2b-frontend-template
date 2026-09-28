import { describe, expect, it } from 'vitest'

import { createAuth } from './auth'
import { memoryCookieStore } from './cookies'

/**
 * The identity service as the phone meets it: it reads the session cookie
 * from the Cookie header and answers with Set-Cookie, rotating it on every
 * refresh. Nothing here is a browser jar; the test's store is the keystore.
 */
function fakeService() {
  let live = new Set<string>()
  let serial = 0
  const seen: { path: string; cookie: string | null; credentials?: string }[] = []
  const json = (status: number, body: unknown, cookie?: string) =>
    new Response(JSON.stringify(body), {
      status,
      headers: {
        'Content-Type': 'application/json',
        ...(cookie !== undefined ? { 'Set-Cookie': cookie } : {}),
      },
    })
  const issue = () => {
    const value = `s${++serial}`
    live.add(value)
    return `uo_session=${value}; Path=/; Max-Age=2592000; HttpOnly; Secure; SameSite=Lax`
  }
  const accessToken = {
    access_token: 'token',
    expires_in: 900,
    user_id: 'u',
    org_id: 'acme',
    membership_id: 'm',
    choose_organization: false,
  }
  const fetch: typeof globalThis.fetch = async (input, init) => {
    const request = input instanceof Request ? input : new Request(String(input), init)
    const path = new URL(request.url).pathname
    const headers = new Headers(init?.headers ?? request.headers)
    const cookie = /uo_session=([^;]+)/.exec(headers.get('Cookie') ?? '')?.[1] ?? null
    seen.push({ path, cookie, ...(init?.credentials ? { credentials: init.credentials } : {}) })
    if (path.endsWith('/sign-in/local')) return json(200, accessToken, issue())
    if (path.endsWith('/session/refresh')) {
      if (!cookie || !live.has(cookie)) return json(401, { code: 'session.none', message: '' })
      live.delete(cookie)
      return json(200, accessToken, issue())
    }
    if (path.endsWith('/session/sign-out')) {
      live = new Set()
      return new Response(null, {
        status: 204,
        headers: { 'Set-Cookie': 'uo_session=; Max-Age=0' },
      })
    }
    if (path.endsWith('/v1/me')) {
      return json(200, {
        user: { id: 'u', email: 'ada@example.com', name: 'Ada' },
        membership: { id: 'm', org_id: 'acme', role: 'user' },
      })
    }
    if (path.endsWith('/permissions')) return json(200, { effective: { user: ['chat'] } })
    return json(404, { code: 'not_found', message: '' })
  }
  return { fetch, seen }
}

describe('a session kept in the keystore', () => {
  it('keeps the rotated cookie, presents it by hand, and survives a restart', async () => {
    const service = fakeService()
    const keystore = memoryCookieStore()
    const auth = createAuth({
      app: 'ofis',
      apiOrigin: 'https://api.example.test',
      fetch: service.fetch,
      cookies: keystore,
      refreshOnRequest: true,
    })

    // Nobody signed in: nothing is asked of the network at all.
    expect(await auth.sessionSource.load()).toBeNull()
    expect(service.seen).toHaveLength(0)

    await auth.signIn.local('ada@example.com', 'correct horse battery')
    expect(keystore.current()).toBe('s1')
    expect(service.seen[0]?.credentials).toBe('omit')

    const session = await auth.sessionSource.load()
    expect(session?.membership?.orgId).toBe('acme')
    expect(session?.permissions).toEqual(['chat'])
    // The refresh presented s1 and was answered with s2, which is now kept.
    expect(service.seen.find((c) => c.path.endsWith('/refresh'))?.cookie).toBe('s1')
    expect(keystore.current()).toBe('s2')

    // The app is killed and launched again: a new instance, the same keystore.
    const again = createAuth({
      app: 'ofis',
      apiOrigin: 'https://api.example.test',
      fetch: service.fetch,
      cookies: keystore,
    })
    expect((await again.sessionSource.load())?.user.email).toBe('ada@example.com')
    expect(keystore.current()).toBe('s3')

    await again.sessionSource.signOut()
    expect(keystore.current()).toBeNull()
    expect(await again.sessionSource.load()).toBeNull()
  })

  it('points the system browser at the provider with the app and the challenge', () => {
    const auth = createAuth({ app: 'ofis', apiOrigin: 'https://api.example.test' })
    const url = new URL(auth.signIn.entraStartUrl('ada@acme.com', '/offices', 'mobile', 'abc'))
    expect(url.pathname).toBe('/identity/v1/sign-in/start')
    expect(url.searchParams.get('client')).toBe('mobile')
    expect(url.searchParams.get('code_challenge')).toBe('abc')
    expect(url.searchParams.get('code_challenge_method')).toBe('S256')
    expect(url.searchParams.get('app')).toBe('ofis')
    expect(url.searchParams.get('next')).toBe('/offices')
    // The scheme is fixed by the identity service; the app never names it.
    expect(url.searchParams.has('redirect_uri')).toBe(false)
  })

  it('redeems the one-time code with the verifier, and keeps the session it answers with', async () => {
    const keystore = memoryCookieStore()
    const sent: { path: string; body: unknown }[] = []
    const fetch: typeof globalThis.fetch = async (input, init) => {
      const url = new URL(String(input instanceof Request ? input.url : input))
      sent.push({ path: url.pathname, body: init?.body ? JSON.parse(String(init.body)) : null })
      if (url.pathname.endsWith('/sign-in/exchange')) {
        const body = JSON.parse(String(init?.body)) as { code_verifier: string }
        if (body.code_verifier !== 'v-1')
          return new Response(JSON.stringify({ code: 'signin.exchange_invalid', message: '' }), {
            status: 400,
          })
        return new Response(
          JSON.stringify({
            access_token: 't',
            expires_in: 900,
            user_id: 'u',
            choose_organization: false,
          }),
          { status: 200, headers: { 'Set-Cookie': 'uo_session=s9; Path=/; HttpOnly' } },
        )
      }
      return new Response(null, { status: 404 })
    }
    const auth = createAuth({
      app: 'ofis',
      apiOrigin: 'https://api.example.test',
      fetch,
      cookies: keystore,
    })
    await expect(auth.signIn.exchange('c', 'wrong')).rejects.toMatchObject({
      code: 'signin.exchange_invalid',
    })
    await auth.signIn.exchange('c', 'v-1')
    expect(sent[1]?.body).toEqual({ code: 'c', code_verifier: 'v-1' })
    expect(keystore.current()).toBe('s9')
    expect(await auth.getToken()).toBe('t')
  })
})
