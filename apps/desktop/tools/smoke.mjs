// Launch the packaged (unpacked) app once and expect it to render the account
// build: the proof, on each platform, that the shell launches and loads.
//
//   npm run package:dir -w @b2b-template/app-desktop && node tools/smoke.mjs
import { spawn } from 'node:child_process'
import { existsSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const release = join(dirname(fileURLToPath(import.meta.url)), '..', 'release')

function executable() {
  switch (process.platform) {
    case 'win32':
      return join(release, 'win-unpacked', 'B2B App.exe')
    case 'darwin': {
      const dir = readdirSync(release).find((d) => d.startsWith('mac'))
      return dir ? join(release, dir, 'B2B App.app', 'Contents', 'MacOS', 'B2B App') : ''
    }
    default:
      return join(release, 'linux-unpacked', 'b2bapp')
  }
}

const exe = executable()
if (!exe || !existsSync(exe)) {
  console.error(`no packaged app at ${exe || release}; run package:dir first`)
  process.exit(1)
}
// Inherited from an editor or CI host, this would run the app as plain Node.
const env = { ...process.env }
delete env.ELECTRON_RUN_AS_NODE
const child = spawn(exe, ['--smoke-test'], { stdio: 'inherit', env })
const timer = setTimeout(() => {
  console.error('smoke test: no answer in 60s')
  child.kill()
  process.exit(1)
}, 60_000)
child.on('exit', (code) => {
  clearTimeout(timer)
  console.log(`smoke test: exit ${code}`)
  process.exit(code ?? 1)
})
