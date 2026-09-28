import { afterEach, describe, expect, it } from 'vitest'

import { desktopBridge, readDesktopPath, readDesktopSignIn } from './desktop'

afterEach(() => {
  delete (globalThis as { b2bappDesktop?: unknown }).b2bappDesktop
})

describe('the desktop bridge', () => {
  it('is there only inside the desktop app', () => {
    expect(desktopBridge()).toBeNull()
    ;(globalThis as { b2bappDesktop?: unknown }).b2bappDesktop = {
      platform: 'win32',
      version: '1',
    }
    expect(desktopBridge()?.platform).toBe('win32')
  })

  it('takes a path in the app and nothing else', () => {
    expect(readDesktopPath('/settings/security')).toBe('/settings/security')
    expect(readDesktopPath('//evil.example')).toBeNull()
    expect(readDesktopPath('https://evil.example')).toBeNull()
    expect(readDesktopPath(42)).toBeNull()
  })

  it('reads a sign-in result, keeping where it returns to inside the app', () => {
    expect(readDesktopSignIn({ code: 'c', verifier: 'v', next: '/profile' })).toEqual({
      code: 'c',
      verifier: 'v',
      next: '/profile',
    })
    expect(readDesktopSignIn({ error: 'provider_refused', next: 'https://evil.example' })).toEqual({
      error: 'provider_refused',
      next: '/',
    })
    expect(readDesktopSignIn({ error: '<b>' })).toBeNull()
    expect(readDesktopSignIn({ code: 'c' })).toBeNull()
    expect(readDesktopSignIn(null)).toBeNull()
  })
})
