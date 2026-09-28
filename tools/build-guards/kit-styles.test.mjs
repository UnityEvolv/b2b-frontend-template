import { mkdirSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { checkStylesheet, missingKitRules } from './kit-styles.mjs'

function fakeRepo() {
  const root = mkdtempSync(join(tmpdir(), 'kit-styles-'))
  mkdirSync(join(root, 'node_modules/@unityevolv/unitykit/dist'), { recursive: true })
  mkdirSync(join(root, 'packages/ui-web/src'), { recursive: true })
  mkdirSync(join(root, 'apps/ofis/src'), { recursive: true })
  return { root, cssPath: join(root, 'apps/ofis/src/styles.css') }
}

describe('checkStylesheet', () => {
  it('passes a stylesheet whose sources resolve and include the kit', () => {
    const { root, cssPath } = fakeRepo()
    const css = `@import "tailwindcss";
@source "../../../node_modules/@unityevolv/unitykit/dist";
@source "../../../packages/ui-web/src";`
    expect(checkStylesheet({ css, cssPath, root })).toEqual([])
  })

  it('catches the path that looks right and resolves to nothing', () => {
    const { root, cssPath } = fakeRepo()
    // One level short: apps/ofis/node_modules, which npm never creates.
    const css = '@source "../../node_modules/@unityevolv/unitykit/dist";'
    expect(checkStylesheet({ css, cssPath, root })).toEqual([
      '@source "../../node_modules/@unityevolv/unitykit/dist" does not resolve to anything',
      'no @source points at node_modules/@unityevolv/unitykit/dist, so kit components will render unstyled',
    ])
  })

  it('refuses a hard-coded colour, but not one in a comment', () => {
    const { root, cssPath } = fakeRepo()
    const kit = '@source "../../../node_modules/@unityevolv/unitykit/dist";\n'
    expect(checkStylesheet({ css: `${kit}/* was #fff */`, cssPath, root })).toEqual([])
    expect(checkStylesheet({ css: `${kit}body { color: #fff }`, cssPath, root })).toEqual([
      'a hard-coded colour; use the unitykit tokens',
    ])
  })
})

describe('missingKitRules', () => {
  it('names kit classes with no CSS in the build', () => {
    expect(missingKitRules('.navbar{display:flex}.btn:hover{}.menu li{}.badge{}')).toEqual([])
    expect(missingKitRules('.navbar-start{}.btnx{}')).toEqual([
      '.navbar',
      '.btn',
      '.menu',
      '.badge',
    ])
  })
})
