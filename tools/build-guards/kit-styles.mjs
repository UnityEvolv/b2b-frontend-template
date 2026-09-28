/**
 * Fail when an app would render unitykit unstyled.
 *
 * Tailwind does not scan node_modules for class names. Without an `@source`
 * pointing at the kit, every kit component renders with its class names in the
 * markup and no CSS behind them — no error, no warning, nothing in the console.
 * A path that looks right but resolves to nothing fails exactly the same way,
 * and npm hoisting makes that easy to get wrong.
 *
 * Checked two ways: every `@source` in an app's stylesheet must resolve, one of
 * them must be the kit, and — once built — the CSS must contain rules for
 * classes only the kit uses. Colours in app stylesheets are refused too; they
 * come from the kit's tokens.
 */
import { existsSync } from 'node:fs'
import { readFile, readdir } from 'node:fs/promises'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

/** Rules the kit's components need and the apps never write themselves. */
const KIT_CLASSES = ['.navbar', '.btn', '.menu', '.badge']
const KIT_DIST = 'node_modules/@unityevolv/unitykit/dist'
const COLOUR = /#([0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b|\b(rgba?|hsla?|oklch|oklab)\(/

export function sourcesIn(css) {
  return [...css.matchAll(/@source\s+["']([^"']+)["']/g)].map((match) => match[1])
}

/** Problems with one app's stylesheet, as sentences. */
export function checkStylesheet({ css, cssPath, root }) {
  const problems = []
  const sources = sourcesIn(css)
  const resolved = sources.map((source) => resolve(dirname(cssPath), source))

  for (const [index, path] of resolved.entries()) {
    if (!existsSync(path)) problems.push(`@source "${sources[index]}" does not resolve to anything`)
  }
  if (!resolved.some((path) => path === resolve(root, KIT_DIST))) {
    problems.push(`no @source points at ${KIT_DIST}, so kit components will render unstyled`)
  }
  const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, '')
  if (COLOUR.test(withoutComments)) {
    problems.push('a hard-coded colour; use the unitykit tokens')
  }
  return problems
}

export function missingKitRules(builtCss) {
  return KIT_CLASSES.filter((name) => !new RegExp(`\\${name}[\\s{:,.[]`).test(builtCss))
}

async function main() {
  const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
  const apps = (await readdir(join(root, 'apps'), { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)

  let failed = false
  for (const app of apps) {
    const cssPath = join(root, 'apps', app, 'src', 'styles.css')
    if (!existsSync(cssPath)) continue
    const problems = checkStylesheet({ css: await readFile(cssPath, 'utf8'), cssPath, root })

    const assets = join(root, 'apps', app, 'dist', 'assets')
    if (existsSync(assets)) {
      const built = (await readdir(assets)).filter((name) => name.endsWith('.css'))
      const css = (
        await Promise.all(built.map((name) => readFile(join(assets, name), 'utf8')))
      ).join('\n')
      const missing = missingKitRules(css)
      if (missing.length > 0) problems.push(`the build has no CSS for ${missing.join(', ')}`)
    } else {
      console.warn(`${app}: not built, so only the stylesheet was checked`)
    }

    for (const problem of problems) console.error(`${relative(root, cssPath)}: ${problem}`)
    failed ||= problems.length > 0
  }

  if (failed) process.exitCode = 1
  else console.log(`unitykit styles reach all ${apps.length} apps.`)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main()
