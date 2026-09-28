import { describe, expect, it } from 'vitest'

import { cookieFrom, splitSetCookie } from './cookies'

describe('the session cookie in a Set-Cookie header', () => {
  it('reads a new value among other cookies, however the platform joined them', () => {
    const header =
      'uo_attempt=; Path=/; Max-Age=0; HttpOnly, uo_session=abc.def; Path=/; Max-Age=2592000; HttpOnly; Secure; SameSite=Lax'
    expect(splitSetCookie(header)).toHaveLength(2)
    expect(cookieFrom(header)).toBe('abc.def')
  })

  it('is cleared by an empty value, a zero Max-Age or a past Expires', () => {
    expect(cookieFrom('uo_session=; Path=/; Max-Age=0')).toBeNull()
    expect(cookieFrom('uo_session=x; Max-Age=-1')).toBeNull()
    const past = 'uo_session=x; Expires=Wed, 21 Oct 2015 07:28:00 GMT; Path=/'
    expect(splitSetCookie(past)).toHaveLength(1)
    expect(cookieFrom(past)).toBeNull()
    const future = 'uo_session=x; Expires=Wed, 21 Oct 2099 07:28:00 GMT; Path=/'
    expect(cookieFrom(future)).toBe('x')
  })

  it('says nothing changed when the cookie is not mentioned', () => {
    expect(cookieFrom(null)).toBeUndefined()
    expect(cookieFrom('other=1; Path=/')).toBeUndefined()
  })

  it('lets the last mention win', () => {
    expect(cookieFrom('uo_session=a; Path=/, uo_session=b; Path=/')).toBe('b')
  })
})
