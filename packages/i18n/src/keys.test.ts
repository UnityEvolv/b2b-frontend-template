import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { NAMESPACES, en } from './index'

/**
 * Every key the kept apps ask for is one the strings have. The web apps'
 * `t` takes any string, so a key left behind by a removed string would
 * only show up as the raw key on screen; this reads the sources instead.
 */

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..')

type Namespace = (typeof NAMESPACES)[number]

/** Where the code that asks for strings lives, and the namespaces it reads by default. */
const SOURCES: Array<[string, Namespace[]]> = [
  ['apps/account/src', ['common', 'account']],
  ['apps/admin/src', ['common', 'admin']],
  ['apps/platform/src', ['common', 'platform']],
  ['apps/mobile/src', ['common', 'mobile', 'account']],
  ['apps/desktop/src', ['common']],
  ['packages/ui-web/src', ['common']],
]

function files(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) return files(path)
    return /\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [path] : []
  })
}

function lookup(ns: string, path: string): unknown {
  let node: unknown = (en as Record<string, unknown>)[ns]
  for (const part of path.split('.')) {
    if (!node || typeof node !== 'object') return undefined
    node = (node as Record<string, unknown>)[part]
  }
  return node
}

/** A full key: a string, or a plural with its forms. */
function resolves(ns: string, key: string): boolean {
  if (typeof lookup(ns, key) === 'string') return true
  return typeof lookup(ns, `${key}_other`) === 'string'
}

/** The start of a key built at run time (`prefs.categories.${c}`): a group of strings. */
function groupExists(ns: string, prefix: string): boolean {
  const path = prefix.replace(/\.$/, '')
  if (path === '') return true
  const node = lookup(ns, path)
  return !!node && typeof node === 'object'
}

function split(key: string, defaults: Namespace[]): [Namespace[], string] {
  const [, ns = '', rest = ''] = /^([a-z]+):(.*)$/s.exec(key) ?? []
  if ((NAMESPACES as readonly string[]).includes(ns)) return [[ns as Namespace], rest]
  return [defaults, key]
}

interface Use {
  file: string
  key: string
  dynamic: boolean
}

/** The keys a file asks for: in `t(...)` calls, and dotted literals naming a string group. */
function uses(file: string, defaults: Namespace[]): Array<Use & { namespaces: Namespace[] }> {
  const source = readFileSync(file, 'utf8')
  const namespaces = new Set<Namespace>(defaults)
  for (const [, ns = ''] of source.matchAll(/useTranslation\(\s*'([a-z]+)'/g))
    if ((NAMESPACES as readonly string[]).includes(ns)) namespaces.add(ns as Namespace)
  // The layout reads every namespace for the labels an app declares.
  if (/useTranslation\(\[navNamespace/.test(source)) NAMESPACES.forEach((ns) => namespaces.add(ns))
  const ns = [...namespaces]
  const name = relative(ROOT, file).split(sep).join('/')
  const found: Array<Use & { namespaces: Namespace[] }> = []

  for (const [, , key = ''] of source.matchAll(/\bt\(\s*(['"])([^'"\n]+)\1/g))
    found.push({ file: name, key, dynamic: false, namespaces: ns })
  for (const [, body = ''] of source.matchAll(/\bt\(\s*`([^`]*)`/g)) {
    const dynamic = body.includes('${')
    found.push({
      file: name,
      key: dynamic ? body.slice(0, body.indexOf('${')) : body,
      dynamic,
      namespaces: ns,
    })
  }
  // Keys kept in data and passed to `t` later: `'scim.guide.okta.step1'`.
  for (const [, key = ''] of source.matchAll(/'([a-zA-Z]+(?:\.[a-zA-Z0-9_]+){2,})'/g)) {
    const [top = ''] = key.split('.')
    if (ns.some((n) => top in en[n]))
      found.push({ file: name, key, dynamic: false, namespaces: ns })
  }
  return found
}

const ALL = SOURCES.flatMap(([dir, defaults]) =>
  files(join(ROOT, dir)).flatMap((file) => uses(file, defaults)),
)

describe('the keys the apps use', () => {
  it('finds the keys it checks', () => {
    // A scan that matched nothing would pass for the wrong reason.
    expect(ALL.filter((u) => !u.dynamic).length).toBeGreaterThan(500)
    expect(ALL.some((u) => u.dynamic)).toBe(true)
  })

  it('all resolve to a string', () => {
    const missing = ALL.filter((use) => {
      const [namespaces, key] = split(use.key, use.namespaces)
      return use.dynamic
        ? !namespaces.some((ns) => groupExists(ns, key))
        : !namespaces.some((ns) => resolves(ns, key))
    }).map((use) => `${use.file}: ${use.key}${use.dynamic ? '…' : ''}`)
    expect([...new Set(missing)]).toEqual([])
  })
})
