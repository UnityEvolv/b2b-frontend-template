import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { backendDir, contractsIn, defaultBackend, repoRoot } from './backend.mjs'

const root = resolve('/work/b2b-frontend-template')

describe('backendDir', () => {
  it('defaults to a b2b-backend-template checkout beside the repository', () => {
    expect(backendDir({ root })).toBe(resolve('/work/b2b-backend-template'))
    expect(defaultBackend()).toBe(resolve(repoRoot, '..', 'b2b-backend-template'))
  })

  it('takes BACKEND_DIR, and an argument over it', () => {
    expect(backendDir({ root, env: { BACKEND_DIR: '/src/backend' } })).toBe(resolve('/src/backend'))
    expect(backendDir({ root, args: ['/cli/backend'], env: { BACKEND_DIR: '/src/backend' } })).toBe(
      resolve('/cli/backend'),
    )
  })

  it('resolves a relative path from where the command was run, and ignores blanks', () => {
    expect(backendDir({ root, args: ['../other'], cwd: '/home/me/src' })).toBe(
      resolve('/home/me/other'),
    )
    expect(backendDir({ root, args: ['backend'], env: { INIT_CWD: '/home/me' } })).toBe(
      resolve('/home/me/backend'),
    )
    expect(backendDir({ root, args: [''], env: { BACKEND_DIR: ' ' } })).toBe(
      resolve('/work/b2b-backend-template'),
    )
  })
})

describe('contractsIn', () => {
  let dir
  afterEach(() => dir && rmSync(dir, { recursive: true, force: true }))

  it('lists the yaml contracts under api/', () => {
    dir = mkdtempSync(join(tmpdir(), 'backend-'))
    mkdirSync(join(dir, 'api'))
    writeFileSync(join(dir, 'api', 'user.yaml'), '')
    writeFileSync(join(dir, 'api', 'identity.yaml'), '')
    writeFileSync(join(dir, 'api', 'README.md'), '')
    expect(contractsIn(dir)).toEqual({
      dir: join(dir, 'api'),
      files: ['identity.yaml', 'user.yaml'],
    })
  })

  it('fails clearly when the checkout, api/ or its contracts are missing', () => {
    dir = mkdtempSync(join(tmpdir(), 'backend-'))
    expect(() => contractsIn(join(dir, 'nope'))).toThrow(/backend checkout not found.*BACKEND_DIR/)
    expect(() => contractsIn(dir)).toThrow(/has no api\/ directory/)
    mkdirSync(join(dir, 'api'))
    expect(() => contractsIn(dir)).toThrow(/no contracts/)
  })
})
