// Print deploy/web/headers.json as nginx add_header lines, for the web
// image. The deploy placeholders stay in; the container's entrypoint fills
// them from its environment at start.
//
//   node tools/app-config/generate-nginx-headers.mjs > headers.conf
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const { headers } = JSON.parse(readFileSync(join(root, 'deploy', 'web', 'headers.json'), 'utf8'))

for (const [name, value] of Object.entries(headers)) {
  // nginx strings: double quotes inside the value become \".
  process.stdout.write(`add_header ${name} "${value.replace(/"/g, '\\"')}" always;\n`)
}
