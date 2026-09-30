// Bring the backend example's contract here and regenerate.
//
//   npm run sync -w @b2b-template/example-projects                       # ../b2b-backend-template
//   npm run sync -w @b2b-template/example-projects -- /path/to/backend
//   BACKEND_DIR=/path/to/backend npm run sync -w @b2b-template/example-projects
//
// Copies <backend>/examples/projects/api/*.yaml into specs/, then runs
// generate. Nothing else needs a backend: generate and the drift check read
// the committed specs/.
import { copyFile, readdir, rm } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const repo = resolve(root, '..', '..')
const to = join(root, 'specs')

const named = process.argv.slice(2).find((a) => a.trim() !== '') ?? process.env.BACKEND_DIR?.trim()
const backend = named
  ? resolve(process.env.INIT_CWD ?? process.cwd(), named)
  : resolve(repo, '..', 'b2b-backend-template')
const from = join(backend, 'examples', 'projects', 'api')

if (!existsSync(from)) {
  console.error(
    `sync: no ${from}. Clone b2b-backend-template beside this repository, or pass its path ` +
      '(npm run sync -w @b2b-template/example-projects -- /path/to/backend, or BACKEND_DIR).',
  )
  process.exit(1)
}

const wanted = (await readdir(from)).filter((f) => f.endsWith('.yaml')).sort()
for (const file of await readdir(to)) {
  if (file.endsWith('.yaml') && !wanted.includes(file)) await rm(join(to, file))
}
for (const file of wanted) await copyFile(join(from, file), join(to, file))
console.log(`synced ${wanted.length} contract(s) from ${from}`)

await import('./generate.mjs')
