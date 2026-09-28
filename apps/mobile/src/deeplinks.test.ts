import { describe, expect, it } from 'vitest'

import { linkTarget } from './deeplinks'
import APP_LINK_PATHS from './link-paths.json'

describe('the links the app opens', () => {
  it('reads each email link, by app link or by scheme', () => {
    expect(linkTarget('https://app.example.test/accept-invite?token=abc')).toEqual({
      kind: 'invite',
      token: 'abc',
    })
    expect(linkTarget('b2bapp://reset-password?token=r')).toEqual({
      kind: 'set-password',
      token: 'r',
    })
    expect(linkTarget('b2bapp://set-password?token=s')).toEqual({
      kind: 'set-password',
      token: 's',
    })
    expect(linkTarget('b2bapp://verify-email?token=v')).toEqual({
      kind: 'verify-email',
      token: 'v',
    })
    expect(linkTarget('b2bapp://mfa/setup?token=m')).toEqual({ kind: 'mfa-setup', token: 'm' })
  })

  it('opens the page with no token so it can say the link is not valid', () => {
    expect(linkTarget('b2bapp://accept-invite')).toEqual({ kind: 'invite', token: '' })
  })

  it('ignores the sign-in callback and anything else', () => {
    expect(linkTarget('b2bapp://auth/callback?code=x')).toBeNull()
    expect(linkTarget('https://app.example.test/profile')).toBeNull()
    expect(linkTarget(null)).toBeNull()
  })

  it('routes every path Android is told to open', () => {
    for (const path of APP_LINK_PATHS) {
      expect(linkTarget(`https://app.example.test${path}?token=t`)).not.toBeNull()
    }
  })
})
