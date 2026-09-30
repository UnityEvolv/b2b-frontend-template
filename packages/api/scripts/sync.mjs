// Bring the backend's contracts here and regenerate.
//
//   npm run sync -w @b2b-template/api                         # ../b2b-backend-template
//   npm run sync -w @b2b-template/api -- /path/to/backend     # a backend checkout named here
//   BACKEND_DIR=/path/to/backend npm run sync -w @b2b-template/api
//
// Copies <backend>/api/*.yaml into specs/, removes contracts the backend no
// longer has, then runs generate. The backend is the first argument, else
// BACKEND_DIR, else a b2b-backend-template checkout beside this repository
// (see backend.mjs). Nothing else needs a backend: generate and
// check:api-generated work from the committed specs/.
import { copyFile, readdir, rm } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { backendDir, contractsIn } from './backend.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const to = join(root, 'specs')

let from, wanted
try {
  ;({ dir: from, files: wanted } = contractsIn(
    backendDir({ args: process.argv.slice(2), env: process.env }),
  ))
} catch (e) {
  console.error(`sync: ${e instanceof Error ? e.message : e}`)
  process.exit(1)
}

for (const file of await readdir(to)) {
  if (file.endsWith('.yaml') && !wanted.includes(file)) await rm(join(to, file))
}
for (const file of wanted) await copyFile(join(from, file), join(to, file))
console.log(`synced ${wanted.length} contract(s) from ${from}`)

await import('./generate.mjs')
