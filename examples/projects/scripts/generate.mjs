// Generate the TypeScript for the projects service's contract.
//
//   npm run generate -w @b2b-template/example-projects
//
// specs/projects.yaml -> src/generated/projects.ts, with the generator and
// formatting packages/api uses for the template's services. The example's
// own drift check (scripts/check.mjs) runs this and fails if the output
// differs from what is committed.
import { mkdir, readdir, rm, writeFile } from 'node:fs/promises'
import { basename, dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import openapiTS, { astToString } from 'openapi-typescript'
import * as prettier from 'prettier'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const specs = join(root, 'specs')
const out = join(root, 'src', 'generated')

const header = (source) =>
  `// Generated from ${source} by examples/projects/scripts/generate.mjs. Never edit by hand:\n` +
  `// change the contract in the backend's examples/projects/api, and the sync brings it here.\n\n`

async function format(path, text) {
  const options = (await prettier.resolveConfig(path)) ?? {}
  return prettier.format(text, { ...options, filepath: path })
}

const files = (await readdir(specs)).filter((f) => f.endsWith('.yaml')).sort()

await rm(out, { recursive: true, force: true })
await mkdir(out, { recursive: true })

for (const file of files) {
  const ast = await openapiTS(pathToFileURL(join(specs, file)))
  const path = join(out, `${basename(file, '.yaml')}.ts`)
  await writeFile(path, await format(path, header(`specs/${file}`) + astToString(ast)))
}

console.log(`generated ${files.length} contract(s): ${files.join(', ')}`)
