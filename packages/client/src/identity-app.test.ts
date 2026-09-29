import { describe, expect, it } from 'vitest'

import { identityApp } from './identity-app'

describe('identityApp', () => {
  it('names each app as the identity service knows it', () => {
    expect(identityApp('admin')).toBe('admin')
    expect(identityApp('platform')).toBe('platform')
    // Until the identity app rename lands in the synced contract.
    expect(identityApp('account')).toBe('ofis')
  })
})
