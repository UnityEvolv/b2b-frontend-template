// Copy the account web build and the production headers into the shell, so
// the packaged app carries exactly what the web deployment serves.
//
//   node tools/copy-web.mjs
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const desktop = join(dirname(fileURLToPath(import.meta.url)), '..')
const root = join(desktop, '..', '..')
const accountBuild = join(root, 'apps', 'account', 'dist')
const headers = join(root, 'deploy', 'web', 'headers.json')
const out = join(desktop, 'web')

if (!existsSync(join(accountBuild, 'index.html'))) {
  console.error('account is not built; run: npm run build -w @b2b-template/app-account')
  process.exit(1)
}
rmSync(out, { recursive: true, force: true })
mkdirSync(out, { recursive: true })
cpSync(accountBuild, out, { recursive: true })
cpSync(headers, join(out, 'headers.json'))

// The shell's addresses, written down from the build's environment, so an
// installed app carries them (UO-117). Addresses only; never a secret.
const variables = [
  'DESKTOP_API_ORIGIN',
  'DESKTOP_IDENTITY_ORIGIN',
  'DESKTOP_UPDATE_URL',
  'DESKTOP_UPDATE_GITHUB',
]
const config = Object.fromEntries(
  variables.filter((name) => process.env[name]).map((name) => [name, process.env[name]]),
)
writeFileSync(join(out, 'desktop.json'), JSON.stringify(config, null, 2) + '\n')
console.log(`copied account build to ${out}`)
