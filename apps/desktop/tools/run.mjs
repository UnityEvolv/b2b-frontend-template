// Launch the shell from source.
//
//   node tools/run.mjs            the window shows the account dev server
//   node tools/run.mjs --build    the window shows the copied account build, as packaged
//   node tools/run.mjs --smoke    load once, exit 0 when it renders, 1 when it does not
import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const desktop = join(dirname(fileURLToPath(import.meta.url)), '..')
const electron = createRequire(import.meta.url)('electron')
const args = process.argv.slice(2)
const env = { ...process.env }
// An editor or CI host may run its own tooling with this set; inherited, it
// would turn the shell into a plain Node process with no Electron in it.
delete env.ELECTRON_RUN_AS_NODE
if (args.includes('--build')) env.DESKTOP_USE_BUILD = '1'
const child = spawn(electron, [desktop, ...(args.includes('--smoke') ? ['--smoke-test'] : [])], {
  stdio: 'inherit',
  env,
})
child.on('exit', (code) => process.exit(code ?? 1))
