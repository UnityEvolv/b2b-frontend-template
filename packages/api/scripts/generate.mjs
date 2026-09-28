// Generate the TypeScript for every service contract in specs/.
//
//   npm run generate -w @b2b-template/api
//
// specs/<service>.yaml -> src/generated/<service>.ts, plus src/generated/index.ts
// naming every service, so a new contract needs no hand-written line anywhere.
// CI runs this and fails if the output differs from what is committed.
import { readdir, rm, mkdir, writeFile } from 'node:fs/promises'
import { basename, dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import openapiTS, { astToString } from 'openapi-typescript'
import * as prettier from 'prettier'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const specs = join(root, 'specs')
const out = join(root, 'src', 'generated')

const header = (source) =>
  `// Generated from ${source} by packages/api/scripts/generate.mjs. Never edit by hand:\n` +
  `// change the contract in the backend, and the sync brings it here.\n\n`

async function format(path, text) {
  const options = (await prettier.resolveConfig(path)) ?? {}
  return prettier.format(text, { ...options, filepath: path })
}

const files = (await readdir(specs)).filter((f) => f.endsWith('.yaml')).sort()
const services = files.map((f) => basename(f, '.yaml'))

await rm(out, { recursive: true, force: true })
await mkdir(out, { recursive: true })

for (const [i, file] of files.entries()) {
  const ast = await openapiTS(pathToFileURL(join(specs, file)))
  const path = join(out, `${services[i]}.ts`)
  await writeFile(path, await format(path, header(`specs/${file}`) + astToString(ast)))
}

const camel = (s) => s.replace(/-(\w)/g, (_, c) => c.toUpperCase())
const index =
  header('specs/*.yaml') +
  services.map((s) => `import type { paths as ${camel(s)} } from './${s}.js'`).join('\n') +
  '\n\n/** Every backend service with a contract. */\n' +
  `export const serviceNames = [${services.map((s) => `'${s}'`).join(', ')}] as const\n\n` +
  '/** Each service name to its paths. */\n' +
  `export interface Services {\n${services.map((s) => `  '${s}': ${camel(s)}`).join('\n')}\n}\n\n` +
  services.map((s) => `export type * as ${camel(s)} from './${s}.js'`).join('\n') +
  '\n'
const indexPath = join(out, 'index.ts')
await writeFile(indexPath, await format(indexPath, index))

console.log(`generated ${services.length} service(s): ${services.join(', ')}`)
