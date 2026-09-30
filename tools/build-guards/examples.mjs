/**
 * Run each example product's own checks, when there are any.
 *
 * An example (examples/<name>) is a workspace like any other: typecheck,
 * lint and the tests reach it through the workspace globs. What only it
 * knows, such as its own generated client's drift and its own build, it
 * says in a `check` script, and this runs that script for every example
 * that has one. A template without examples/ has nothing to check and
 * passes: nothing here names an example.
 */
import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

/** The examples under root with a `check` script, as `examples/<name>`. */
export function examplesWithChecks(root) {
  const dir = join(root, 'examples')
  if (!existsSync(dir)) return []
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => `examples/${entry.name}`)
    .filter((path) => {
      const manifest = join(root, path, 'package.json')
      if (!existsSync(manifest)) return false
      return typeof JSON.parse(readFileSync(manifest, 'utf8')).scripts?.check === 'string'
    })
    .sort()
}

function main() {
  const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
  const examples = examplesWithChecks(root)
  if (examples.length === 0) {
    console.log('No examples with checks of their own.')
    return
  }
  const windows = process.platform === 'win32'
  for (const example of examples) {
    console.log(`${example}: npm run check`)
    try {
      execFileSync(windows ? 'npm.cmd' : 'npm', ['run', 'check'], {
        cwd: join(root, example),
        stdio: 'inherit',
        shell: windows,
      })
    } catch {
      console.error(`${example}: its checks failed.`)
      process.exitCode = 1
    }
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main()
