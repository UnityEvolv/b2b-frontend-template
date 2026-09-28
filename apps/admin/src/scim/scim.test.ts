import { describe, expect, it } from 'vitest'

import { scimURL } from './scim'

describe('scim helpers', () => {
  it('keeps an absolute URL and anchors a relative one to the user service', () => {
    expect(scimURL('https://api.example.test/user/scim/v2/o', 'http://localhost:8083')).toBe(
      'https://api.example.test/user/scim/v2/o',
    )
    expect(scimURL('/scim/v2/o', 'http://localhost:8083/')).toBe('http://localhost:8083/scim/v2/o')
    expect(scimURL('/scim/v2/o', undefined)).toBe('/scim/v2/o')
  })
})
