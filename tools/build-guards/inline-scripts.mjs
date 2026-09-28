/**
 * Fail when a built app carries an inline script the policy does not allow.
 *
 * The apps ship one inline script, the first-paint theme script, allowed by
 * its hash. A second one, an inline event handler, or a javascript: URL would
 * be blocked by the Content Security Policy in production and would show up as
 * a broken page rather than an error here. So it is checked at build time.
 */
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'

import { FIRST_PAINT_SCRIPT } from '@b2b-template/app-config/first-paint'

const INLINE_SCRIPT = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi
const EVENT_HANDLER = /\son[a-z]+\s*=/i
const JAVASCRIPT_URL = /(href|src|action)\s*=\s*["']?\s*javascript:/i

const hash = (text) => createHash('sha256').update(text).digest('base64')
const ALLOWED = hash(FIRST_PAINT_SCRIPT)

/** Problems with one built page, as sentences. */
export function checkHtml(html, name = 'index.html') {
  const problems = []
  for (const match of html.matchAll(INLINE_SCRIPT)) {
    const body = match[1]
    if (hash(body) !== ALLOWED) {
      problems.push(
        `${name}: an inline script other than the first-paint theme script (sha256 ${hash(body)}). The Content Security Policy allows only that one; move this into a module.`,
      )
    }
  }
  if (EVENT_HANDLER.test(html)) {
    problems.push(
      `${name}: an inline event handler (on…=). The policy blocks these; attach listeners from a module.`,
    )
  }
  if (JAVASCRIPT_URL.test(html)) {
    problems.push(`${name}: a javascript: URL. The policy blocks these.`)
  }
  return problems
}

export async function checkBuiltApps(root, apps) {
  const problems = []
  for (const app of apps) {
    const path = `${root}/apps/${app}/dist/index.html`
    let html
    try {
      html = await readFile(path, 'utf8')
    } catch {
      problems.push(`apps/${app}/dist/index.html is missing; run the build first.`)
      continue
    }
    problems.push(...checkHtml(html, `apps/${app}/dist/index.html`))
  }
  return problems
}

if (
  process.argv[1] &&
  import.meta.url === new URL(`file://${process.argv[1].replace(/\\/g, '/')}`).href
) {
  const problems = await checkBuiltApps(process.cwd(), ['account', 'admin', 'platform'])
  for (const p of problems) console.error(p)
  process.exit(problems.length ? 1 : 0)
}
