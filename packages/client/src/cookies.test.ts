import { describe, expect, it } from 'vitest'

import { cookieFrom, splitSetCookie } from './cookies'

describe('the session cookie in a Set-Cookie header', () => {
  it('reads a new value among other cookies, however the platform joined them', () => {
    const header =
      'b2bapp_signin=; Path=/; Max-Age=0; HttpOnly, b2bapp_session=abc.def; Path=/; Max-Age=2592000; HttpOnly; Secure; SameSite=Lax'
    expect(splitSetCookie(header)).toHaveLength(2)
    expect(cookieFrom(header)).toBe('abc.def')
  })

  it('is cleared by an empty value, a zero Max-Age or a past Expires', () => {
    expect(cookieFrom('b2bapp_session=; Path=/; Max-Age=0')).toBeNull()
    expect(cookieFrom('b2bapp_session=x; Max-Age=-1')).toBeNull()
    const past = 'b2bapp_session=x; Expires=Wed, 21 Oct 2015 07:28:00 GMT; Path=/'
    expect(splitSetCookie(past)).toHaveLength(1)
    expect(cookieFrom(past)).toBeNull()
    const future = 'b2bapp_session=x; Expires=Wed, 21 Oct 2099 07:28:00 GMT; Path=/'
    expect(cookieFrom(future)).toBe('x')
  })

  it('says nothing changed when the cookie is not mentioned', () => {
    expect(cookieFrom(null)).toBeUndefined()
    expect(cookieFrom('other=1; Path=/')).toBeUndefined()
  })

  it('lets the last mention win', () => {
    expect(cookieFrom('b2bapp_session=a; Path=/, b2bapp_session=b; Path=/')).toBe('b')
  })
})
