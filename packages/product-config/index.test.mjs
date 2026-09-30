import { describe, expect, it } from 'vitest'

import { cookieName, PRODUCT, recoveryCodesFile, storageKey } from './index.mjs'

describe('the product config', () => {
  it('names the template product by default', () => {
    expect(PRODUCT).toEqual({
      productId: 'b2bapp',
      productName: 'B2B App',
      storagePrefix: 'b2bapp',
      urlScheme: 'b2bapp',
      wordmark: ['B2B ', 'App'],
      webSecurity: { origins: {}, permissions: [] },
    })
  })

  it('writes the product name in the wordmark', () => {
    expect(PRODUCT.wordmark.join('')).toBe(PRODUCT.productName)
  })

  it('keeps everything on a device under the prefix', () => {
    expect(storageKey('theme')).toBe('b2bapp:theme')
    expect(recoveryCodesFile()).toBe('b2bapp-recovery-codes.txt')
  })

  it('names cookies as the backend does, under the product id', () => {
    expect(PRODUCT.productId).toMatch(/^[a-z0-9-]+$/)
    expect(cookieName('session')).toBe('b2bapp_session')
    expect(cookieName('signin')).toBe('b2bapp_signin')
  })

  it('has a scheme a URL can carry', () => {
    expect(PRODUCT.urlScheme).toMatch(/^[a-z][a-z0-9+.-]*$/)
  })
})
