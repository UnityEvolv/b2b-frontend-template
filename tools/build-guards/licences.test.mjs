import { describe, expect, it } from 'vitest'

import { acceptable, checkLockfile } from './licences.mjs'

describe('acceptable', () => {
  it('passes permissive and weak-copyleft licences', () => {
    for (const id of ['MIT', 'ISC', 'Apache-2.0', 'MPL-2.0', 'LGPL-3.0-or-later', 'BSD-3-Clause']) {
      expect(acceptable(id), id).toBe(true)
    }
  })

  it('refuses copyleft, the SSPL, and anything unknown', () => {
    for (const id of [
      'GPL-3.0',
      'AGPL-3.0-only',
      'SSPL-1.0',
      'UNLICENSED',
      'SEE LICENSE IN x',
      '',
    ]) {
      expect(acceptable(id), id).toBe(false)
    }
    expect(acceptable(undefined)).toBe(false)
    expect(acceptable({ type: 'MIT' })).toBe(false)
  })

  it('takes either side of an OR and both sides of an AND', () => {
    expect(acceptable('(BSD-3-Clause OR GPL-2.0)')).toBe(true)
    expect(acceptable('MIT AND GPL-3.0')).toBe(false)
    expect(acceptable('(MIT AND Apache-2.0) OR AGPL-3.0')).toBe(true)
    expect(acceptable('GPL-2.0 WITH Classpath-exception-2.0')).toBe(false)
    expect(acceptable('Apache-2.0 WITH LLVM-exception')).toBe(true)
  })
})

describe('checkLockfile', () => {
  const lock = (packages) => ({ lockfileVersion: 3, packages })

  it('passes the workspaces and allowed packages', () => {
    const result = checkLockfile(
      lock({
        '': { name: 'root' },
        'apps/a': { name: '@x/a' },
        'node_modules/@x/a': { resolved: 'apps/a', link: true },
        'node_modules/left-pad': { license: 'MIT' },
      }),
    )
    expect(result.problems).toEqual([])
  })

  it('names a copyleft package, an unknown one, and one without a licence', () => {
    const { problems } = checkLockfile(
      lock({
        'node_modules/a': { license: 'GPL-3.0' },
        'node_modules/b': { license: 'Custom' },
        'node_modules/c/node_modules/d': {},
      }),
    )
    expect(problems).toEqual([
      'node_modules/a: "GPL-3.0" is a copyleft licence the template cannot carry.',
      'node_modules/b: "Custom" is a licence this check does not recognise.',
      'node_modules/c/node_modules/d: null is a licence this check does not recognise.',
    ])
  })

  it('refuses the engine packages by name, installed or only requested', () => {
    const { problems } = checkLockfile(
      lock({
        'apps/a': { dependencies: { '@unityevolv/ofiskit-ui-map': '^1.0.0' } },
        'node_modules/@unityevolv/ofiskit-realtime-client': { license: 'MIT' },
        'node_modules/@unityevolv/unitykit': { license: 'MIT' },
      }),
    )
    expect(problems).toEqual([
      'apps/a depends on @unityevolv/ofiskit-ui-map, which is refused by name.',
      'node_modules/@unityevolv/ofiskit-realtime-client: @unityevolv/ofiskit-realtime-client is refused by name.',
    ])
  })
})
