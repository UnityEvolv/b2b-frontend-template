import { describe, expect, it } from 'vitest'

import { FIRST_PAINT_SCRIPT } from '@b2b-template/app-config/first-paint'

import { checkHtml } from './inline-scripts.mjs'

const page = (body) =>
  `<!doctype html><html><head>${body}</head><body><div id="root"></div></body></html>`

describe('inline scripts guard', () => {
  it('accepts the first-paint script and external modules', () => {
    const html = page(
      `<script>${FIRST_PAINT_SCRIPT}</script><script type="module" crossorigin src="/assets/index-abc.js"></script>`,
    )
    expect(checkHtml(html)).toEqual([])
  })

  it('refuses any other inline script', () => {
    expect(checkHtml(page('<script>alert(1)</script>'))).toHaveLength(1)
    expect(checkHtml(page('<script>alert(1)</script>'))[0]).toMatch(
      /inline script other than the first-paint/,
    )
  })

  it('refuses inline event handlers and javascript: URLs', () => {
    expect(checkHtml(page('<button onclick="go()">x</button>'))).toHaveLength(1)
    expect(checkHtml(page('<a href="javascript:void(0)">x</a>'))).toHaveLength(1)
  })
})
