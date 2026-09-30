// Where the backend checkout is, for sync.mjs.
//
// The first argument, else BACKEND_DIR, else a b2b-backend-template checkout
// beside this repository (../b2b-backend-template from the repository root).
// Only sync needs a backend; generate and check:api-generated read specs/.
import { existsSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

/** The repository root: packages/api/scripts -> three levels up. */
export const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..')

/** The default backend checkout, beside this repository. */
export const defaultBackend = (root = repoRoot) => resolve(root, '..', 'b2b-backend-template')

/**
 * The backend directory to sync from.
 * A relative path is taken from where the command was run (npm's INIT_CWD),
 * not from packages/api where npm runs the script.
 * @param {{ args?: string[], env?: Record<string, string | undefined>, root?: string, cwd?: string }} [from]
 */
export function backendDir({ args = [], env = {}, root = repoRoot, cwd } = {}) {
  const named = args.find((a) => a.trim() !== '') ?? (env.BACKEND_DIR?.trim() || undefined)
  if (!named) return defaultBackend(root)
  return resolve(cwd ?? env.INIT_CWD ?? process.cwd(), named)
}

/**
 * The contract files (<backend>/api/*.yaml), or a clear error naming what was
 * looked for and how to point at another checkout.
 * @param {string} backend
 */
export function contractsIn(backend) {
  const how =
    'Clone b2b-backend-template beside this repository, or pass its path: ' +
    'npm run sync -w @b2b-template/api -- /path/to/backend (or set BACKEND_DIR).'
  if (!existsSync(backend) || !statSync(backend).isDirectory())
    throw new Error(`backend checkout not found at ${backend}. ${how}`)
  const api = join(backend, 'api')
  if (!existsSync(api) || !statSync(api).isDirectory())
    throw new Error(
      `${backend} has no api/ directory; is it a b2b-backend-template checkout? ${how}`,
    )
  const files = readdirSync(api)
    .filter((f) => f.endsWith('.yaml'))
    .sort()
  if (files.length === 0) throw new Error(`no contracts (*.yaml) in ${api}. ${how}`)
  return { dir: api, files }
}
