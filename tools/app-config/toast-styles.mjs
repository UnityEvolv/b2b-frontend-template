/**
 * The toast library the design system uses injects its stylesheet as a
 * <style> element when it loads: first empty, then filled. Both are allowed
 * by their hashes, read from the installed version, so style-src stays
 * 'self' plus exactly this text. An upgrade changes the text, and the
 * regenerated headers follow it.
 */
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'

const require = createRequire(import.meta.url)

function injectedCss() {
  const entry = join(dirname(require.resolve('sonner')), 'index.mjs')
  const source = readFileSync(entry, 'utf8')
  const call = source.indexOf('__insertCSS("')
  if (call < 0) throw new Error(`toast styles: no injected stylesheet found in ${entry}`)
  const start = source.indexOf('"', call)
  let end = start + 1
  while (source[end] !== '"' || source[end - 1] === '\\') end++
  return JSON.parse(source.slice(start, end + 1))
}

const hash = (/** @type {string} */ text) =>
  `'sha256-${createHash('sha256').update(text).digest('base64')}'`

/** The empty element, then the element with the library's stylesheet. */
export const TOAST_STYLE_HASHES = [hash(''), hash(injectedCss())]
