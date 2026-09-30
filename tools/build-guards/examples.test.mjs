import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { examplesWithChecks } from './examples.mjs'

const made = []
afterEach(() => {
  for (const dir of made.splice(0)) rmSync(dir, { recursive: true, force: true })
})

function repo(examples) {
  const root = mkdtempSync(join(tmpdir(), 'examples-guard-'))
  made.push(root)
  for (const [name, manifest] of Object.entries(examples)) {
    mkdirSync(join(root, 'examples', name), { recursive: true })
    if (manifest)
      writeFileSync(join(root, 'examples', name, 'package.json'), JSON.stringify(manifest))
  }
  return root
}

describe('the examples guard', () => {
  it('passes a template with no examples/ at all', () => {
    expect(examplesWithChecks(repo({}))).toEqual([])
  })

  it('runs only the examples that declare a check of their own', () => {
    const root = repo({
      widgets: { scripts: { check: 'node check.mjs' } },
      gadgets: { scripts: { build: 'vite build' } },
      notes: null,
    })
    expect(examplesWithChecks(root)).toEqual(['examples/widgets'])
  })
})

describe('the copy without examples', () => {
  it('holds everything but examples/', async () => {
    const { withoutExamples } = await import('./without-examples.mjs')
    expect(
      withoutExamples([
        'package.json',
        'examples/projects/package.json',
        'apps/account/src/app.ts',
        'examples-notes.md',
      ]),
    ).toEqual(['package.json', 'apps/account/src/app.ts', 'examples-notes.md'])
  })
})
