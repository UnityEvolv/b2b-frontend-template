import { describe, expect, it } from 'vitest'

import { findIdentifiers } from './identifiers.mjs'

// Built from pieces so this file passes the check it tests.
const PRODUCT = 'unityo' + 'fis'
const KEY = 'U' + 'O-42'

describe('findIdentifiers', () => {
  it('finds the product, its ticket keys and its hostname', () => {
    const text = [
      `// ${PRODUCT} does this`,
      `// see ${KEY}`,
      `host: app.unityevolv${'.'}com`,
      'ok',
    ].join('\n')
    expect(findIdentifiers('a.ts', text)).toEqual([
      `a.ts:1: // ${PRODUCT} does this`,
      `a.ts:2: // see ${KEY}`,
      `a.ts:3: host: app.unityevolv${'.'}com`,
    ])
  })

  it('leaves the design system and words that merely contain the letters', () => {
    const text = ["import '@unityevolv/unitykit'", 'officer', 'profiser', 'b2bapp_session'].join(
      '\n',
    )
    expect(findIdentifiers('a.ts', text)).toEqual([])
  })

  it('finds the original cookie and SCIM token names', () => {
    const cookie = 'u' + 'o_session=abc'
    const token = 'u' + 'oscim_123'
    expect(findIdentifiers('a.ts', [cookie, token].join('\n'))).toEqual([
      `a.ts:1: ${cookie}`,
      `a.ts:2: ${token}`,
    ])
  })

  it('exempts no file, generated or not', () => {
    expect(findIdentifiers('packages/api/src/generated/identity.ts', `'${PRODUCT}'`)).toEqual([
      `packages/api/src/generated/identity.ts:1: '${PRODUCT}'`,
    ])
  })
})
