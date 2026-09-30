import { describe, expect, it } from 'vitest'

import { PRODUCT, recoveryCodesFile, storageKey } from './index.mjs'

describe('the product config', () => {
  it('names the template product by default', () => {
    expect(PRODUCT).toEqual({
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

  it('has a scheme a URL can carry', () => {
    expect(PRODUCT.urlScheme).toMatch(/^[a-z][a-z0-9+.-]*$/)
  })
})
