// Bring the backend's contracts here and regenerate.
//
//   npm run sync -w @b2b-template/api                         # ../b2b-backend-template
//   npm run sync -w @b2b-template/api -- /path/to/backend     # a backend checkout named here
//   BACKEND_DIR=/path/to/backend npm run sync -w @b2b-template/api
//
// Copies <backend>/api/*.yaml into specs/, removes contracts the backend no
// longer has, then runs generate. The backend is the first argument, else
// BACKEND_DIR, else a b2b-backend-template checkout beside this repository.
import { copyFile, readdir, rm } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const backend = resolve(
  process.argv[2] ??
    process.env.BACKEND_DIR ??
    join(root, '..', '..', '..', 'b2b-backend-template'),
)
const from = join(backend, 'api')
const to = join(root, 'specs')

const wanted = (await readdir(from)).filter((f) => f.endsWith('.yaml'))
if (wanted.length === 0)
  throw new Error(`no contracts in ${from}; pass the backend's path or set BACKEND_DIR`)

for (const file of await readdir(to)) {
  if (file.endsWith('.yaml') && !wanted.includes(file)) await rm(join(to, file))
}
for (const file of wanted) await copyFile(join(from, file), join(to, file))
console.log(`synced ${wanted.length} contract(s) from ${from}`)

await import('./generate.mjs')
