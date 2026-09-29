import { PRODUCT } from '@b2b-template/product-config'
import { describe, expect, it } from 'vitest'

import { PRODUCT_NAME, SCHEME } from './defaults.config'

describe('the desktop shell identity', () => {
  it('matches the product config, which electron-builder.yml repeats', () => {
    expect(PRODUCT_NAME).toBe(PRODUCT.productName)
    expect(SCHEME).toBe(PRODUCT.urlScheme)
  })
})
