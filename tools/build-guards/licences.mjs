/**
 * Fail when a package anywhere in the dependency graph is under a licence the
 * template cannot carry, or under no licence we recognise.
 *
 * The template is MIT, and a product built on it must be free to stay closed.
 * So strong copyleft (GPL, AGPL) and the SSPL are refused outright, and so is
 * anything this list does not know: an unknown licence is a question for a
 * person, not a pass. Weak copyleft (LGPL, MPL) is allowed: it binds changes
 * to that library's own files, never the code that uses it.
 *
 * It reads package-lock.json rather than node_modules, so it sees every
 * package npm could install on any platform, including optional ones this
 * machine skipped. It also refuses the original product's AGPL engine
 * packages by name, however they are licensed.
 */
import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

/** Permissive and weak-copyleft licences, by SPDX id. */
export const ALLOWED = new Set([
  '0BSD',
  'Apache-2.0',
  'BlueOak-1.0.0',
  'BSD-2-Clause',
  'BSD-3-Clause',
  'CC-BY-4.0', // data only (caniuse-lite)
  'CC0-1.0',
  'ISC',
  'LGPL-2.1',
  'LGPL-2.1-only',
  'LGPL-2.1-or-later',
  'LGPL-3.0',
  'LGPL-3.0-only',
  'LGPL-3.0-or-later',
  'MIT',
  'MIT-0',
  'MPL-2.0',
  'Python-2.0',
  'Unlicense',
  'WTFPL',
  'Zlib',
])

/**
 * Packages allowed despite a licence not on the list, each with the reason.
 * Matched by name, so every platform build of a package is covered.
 */
export const EXCEPTIONS = new Map([
  [
    /^@sentry\/cli(-[a-z0-9-]+)?$/,
    'FSL-1.1-MIT: a build-time tool that uploads source maps, never shipped in an app. ' +
      'It permits any use except offering a competing product, and becomes MIT two years after each release.',
  ],
])

/** Refused by name: the original product's engine, AGPL for its UI and realtime parts. */
export const FORBIDDEN_NAME = /^@unityevolv\/ofiskit(-|$)/

const REFUSED = /(^|[^L])GPL|AGPL|SSPL/i

/** Split an SPDX expression into tokens: ids, `AND`, `OR`, and parentheses. */
function tokens(expression) {
  return expression.match(/\(|\)|[^\s()]+/g) ?? []
}

/**
 * Whether an SPDX expression is acceptable: `A OR B` when either is, `A AND B`
 * when both are. `WITH` exceptions only narrow a licence, so they are ignored.
 */
export function acceptable(expression) {
  if (typeof expression !== 'string' || expression.trim() === '') return false
  const list = tokens(expression)
  let at = 0
  const orExpr = () => {
    let ok = andExpr()
    while (list[at]?.toUpperCase() === 'OR') {
      at++
      ok = andExpr() || ok
    }
    return ok
  }
  const andExpr = () => {
    let ok = term()
    while (list[at]?.toUpperCase() === 'AND') {
      at++
      ok = term() && ok
    }
    return ok
  }
  const term = () => {
    const token = list[at++]
    let ok
    if (token === '(') {
      ok = orExpr()
      if (list[at++] !== ')') return false
    } else {
      const id = (token ?? '').replace(/\+$/, '')
      ok = ALLOWED.has(id)
    }
    if (list[at]?.toUpperCase() === 'WITH') at += 2
    return ok
  }
  const ok = orExpr()
  return ok && at === list.length
}

/** The package's name from its lockfile key, `node_modules/a/node_modules/@b/c` → `@b/c`. */
function nameOf(key, entry) {
  return entry.name ?? key.slice(key.lastIndexOf('node_modules/') + 'node_modules/'.length)
}

/** Problems with a parsed package-lock.json (v2 or v3), as sentences. */
export function checkLockfile(lock) {
  const problems = []
  const accepted = []
  for (const [key, entry] of Object.entries(lock.packages ?? {})) {
    const requested = Object.keys({
      ...entry.dependencies,
      ...entry.devDependencies,
      ...entry.optionalDependencies,
      ...entry.peerDependencies,
    })
    for (const dep of requested) {
      if (FORBIDDEN_NAME.test(dep)) {
        problems.push(`${key || 'the root package'} depends on ${dep}, which is refused by name.`)
      }
    }
    // The root and the workspaces are this repository's own code, MIT.
    if (!key.includes('node_modules/') || entry.link) continue
    const name = nameOf(key, entry)
    if (FORBIDDEN_NAME.test(name)) {
      problems.push(`${key}: ${name} is refused by name.`)
      continue
    }
    const licence = entry.license
    if (acceptable(licence)) continue
    const exception = [...EXCEPTIONS].find(([pattern]) => pattern.test(name))
    if (exception) {
      accepted.push(`${name} (${licence})`)
      continue
    }
    const what =
      typeof licence === 'string' && REFUSED.test(licence.replace(/LGPL/gi, ''))
        ? 'a copyleft licence the template cannot carry'
        : 'a licence this check does not recognise'
    problems.push(`${key}: ${JSON.stringify(licence ?? null)} is ${what}.`)
  }
  return { problems, accepted }
}

async function main() {
  const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
  const lock = JSON.parse(await readFile(join(root, 'package-lock.json'), 'utf8'))
  const { problems, accepted } = checkLockfile(lock)
  const count = Object.keys(lock.packages ?? {}).filter((key) =>
    key.includes('node_modules/'),
  ).length
  if (accepted.length > 0) console.log(`Allowed by a named exception: ${accepted.join(', ')}`)
  for (const problem of problems) console.error(problem)
  if (problems.length > 0) {
    console.error(`${problems.length} package(s) fail the licence check.`)
    process.exitCode = 1
  } else {
    console.log(`All ${count} packages have an allowed licence, and none is refused by name.`)
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main()
