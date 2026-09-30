/**
 * Fail when a tracked file names the product this template was carved from,
 * its internal ticket keys or its hostnames.
 *
 * The template is public and product-neutral: a product built on it brings
 * its own names through packages/product-config, and nothing of the original
 * product's infrastructure or process belongs here. Each pattern is written
 * with a one-character class so that this file does not match itself.
 */
import { execFileSync } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const PATTERNS = [
  /unity[o]fis/i,
  /\b[o]fis\b/i,
  /\bU[O]-[0-9]/i,
  /unityevolv[.]com/i,
  // The original product's cookie and SCIM token names; the template's come
  // from the product id (product-config's cookieName).
  /\bu[o]_(session|signin|attempt)\b/i,
  /\bu[o]scim/i,
]

/** The lines of one file that match, as `path:line: text`. No file is exempt. */
export function findIdentifiers(path, text) {
  const hits = []
  text.split('\n').forEach((line, index) => {
    if (PATTERNS.some((pattern) => pattern.test(line))) {
      hits.push(`${path}:${index + 1}: ${line.trim()}`)
    }
  })
  return hits
}

async function main() {
  const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
  const files = execFileSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8' })
    .split('\0')
    .filter(Boolean)
  const hits = []
  for (const path of files) {
    let text
    try {
      text = await readFile(join(root, path), 'utf8')
    } catch {
      continue // deleted in the working tree
    }
    hits.push(...findIdentifiers(path, text))
  }
  for (const hit of hits) console.error(hit)
  if (hits.length > 0) {
    console.error(`${hits.length} line(s) name the original product or its infrastructure.`)
    process.exitCode = 1
  } else {
    console.log(`No internal identifiers in ${files.length} tracked files.`)
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main()
