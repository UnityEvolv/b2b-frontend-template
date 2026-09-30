// The example's own checks, run by the template's `npm run check:examples`
// (tools/build-guards/examples.mjs) for every example that has one:
//
// - the generated client matches its contract (regenerate, then no diff),
// - the app builds,
// - the build carries unitykit's styles and no inline script the policy
//   would block: the template's guards, over this app's build.
import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { readFile, readdir } from 'node:fs/promises'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

import { checkHtml } from '@b2b-template/build-guards/inline-scripts'
import { checkStylesheet, missingKitRules } from '@b2b-template/build-guards/kit-styles'

const here = join(dirname(fileURLToPath(import.meta.url)), '..')
const repo = join(here, '..', '..')
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm'
const run = (command, args, cwd = here) =>
  execFileSync(command, args, { cwd, stdio: 'inherit', shell: process.platform === 'win32' })

const problems = []

run('node', ['scripts/generate.mjs'])
try {
  run('git', ['diff', '--exit-code', '--', 'specs', 'src/generated'])
} catch {
  problems.push('src/generated differs from specs/: run `npm run generate` here and commit it')
}

run(npm, ['run', 'build'])

const cssPath = join(here, 'src', 'styles.css')
problems.push(
  ...checkStylesheet({ css: await readFile(cssPath, 'utf8'), cssPath, root: repo }).map(
    (p) => `${relative(repo, cssPath)}: ${p}`,
  ),
)
const assets = join(here, 'dist', 'assets')
const built = existsSync(assets) ? (await readdir(assets)).filter((n) => n.endsWith('.css')) : []
const css = (await Promise.all(built.map((n) => readFile(join(assets, n), 'utf8')))).join('\n')
const missing = missingKitRules(css)
if (missing.length > 0) problems.push(`the build has no CSS for ${missing.join(', ')}`)
problems.push(
  ...checkHtml(await readFile(join(here, 'dist', 'index.html'), 'utf8'), 'dist/index.html'),
)

for (const problem of problems) console.error(`examples/projects: ${problem}`)
if (problems.length > 0) process.exit(1)
console.log('examples/projects: client, build, styles and scripts all check.')
