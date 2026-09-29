import { PRODUCT } from '@b2b-template/product-config'
import { describe, expect, it } from 'vitest'

import DEFAULTS from './app-identity.json'

describe('the phone app identity', () => {
  it('matches the product config, which app.config.ts cannot read', () => {
    expect(DEFAULTS.name).toBe(PRODUCT.productName)
    expect(DEFAULTS.scheme).toBe(PRODUCT.urlScheme)
  })
})
