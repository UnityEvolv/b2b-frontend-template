/**
 * Prove that nothing in the template depends on examples/.
 *
 *   node tools/build-guards/without-examples.mjs [--keep]
 *
 * Copies the working tree (tracked files, and new ones git does not ignore)
 * to a temporary directory without examples/, installs there as a product
 * that deleted it would, and runs the type check, lint, format check, tests,
 * build and build guards. Any reference from the template into an example
 * fails one of them. `--keep` leaves the copy behind to look at.
 *
 * A product built from the template deletes examples/ and, if it likes,
 * this script and its CI job; nothing else refers to them.
 */
import { execFileSync } from 'node:child_process'
import { cpSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

/** The files a copy without examples/ holds: everything but examples/ itself. */
export function withoutExamples(files) {
  return files.filter((path) => path !== 'examples' && !path.startsWith('examples/'))
}

/** What the copy must pass, in order. */
export const STEPS = [
  ['install', ['install', '--prefer-offline', '--no-audit', '--no-fund']],
  ['typecheck', ['run', 'typecheck']],
  ['lint', ['run', 'lint']],
  ['format', ['run', 'format:check']],
  ['test', ['test']],
  ['build', ['run', 'build']],
  ['unitykit styles', ['run', 'check:kit-styles']],
  ['inline scripts', ['run', 'check:inline-scripts']],
  ['examples guard', ['run', 'check:examples']],
]

function main() {
  const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
  const keep = process.argv.includes('--keep')
  const files = execFileSync(
    'git',
    ['ls-files', '-z', '--cached', '--others', '--exclude-standard', '--deduplicate'],
    { cwd: root, encoding: 'utf8' },
  )
    .split('\0')
    .filter(Boolean)
  const copy = withoutExamples(files)
  const dir = mkdtempSync(join(tmpdir(), 'without-examples-'))
  console.log(`copying ${copy.length} files (of ${files.length}) to ${dir}, without examples/`)
  for (const path of copy) {
    const to = join(dir, path)
    mkdirSync(dirname(to), { recursive: true })
    try {
      cpSync(join(root, path), to)
    } catch {
      // Deleted in the working tree but still tracked: a copy without it is what a commit holds.
    }
  }

  const windows = process.platform === 'win32'
  let failed = null
  for (const [name, args] of STEPS) {
    console.log(`\n== without examples/: ${name} (npm ${args.join(' ')})`)
    try {
      execFileSync(windows ? 'npm.cmd' : 'npm', args, {
        cwd: dir,
        stdio: 'inherit',
        shell: windows,
      })
    } catch {
      failed = name
      break
    }
  }

  if (!keep) rmSync(dir, { recursive: true, force: true, maxRetries: 3 })
  if (failed) {
    console.error(`\nThe template without examples/ fails its ${failed}.`)
    process.exit(1)
  }
  console.log('\nThe template without examples/ installs, type checks, lints, tests and builds.')
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main()
