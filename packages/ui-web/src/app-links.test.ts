import { describe, expect, it } from 'vitest'

import { appLink } from './app-links'
import { appOriginsFromEnv } from './env'

describe('where each web app is', () => {
  it('reads VITE_<APP>_ORIGIN, and not the API’s', () => {
    expect(
      appOriginsFromEnv({
        VITE_ADMIN_ORIGIN: 'https://admin.example.test/',
        VITE_ACCOUNT_ORIGIN: 'https://account.example.test',
        VITE_PROJECTS_ORIGIN: 'https://projects.example.test',
        VITE_API_ORIGIN: 'https://api.example.test',
        VITE_API_ORIGIN_IDENTITY: 'https://identity.example.test',
        VITE_PLATFORM_ORIGIN: '',
        DEV: true,
      }),
    ).toEqual({
      admin: 'https://admin.example.test',
      account: 'https://account.example.test',
      projects: 'https://projects.example.test',
    })
  })
})

describe('a path in a web app, from this one', () => {
  const origins = { projects: 'https://projects.example.test' }

  it('is a route here when the app is this one', () => {
    expect(appLink('admin', '/users/invite', 'admin', origins)).toEqual({
      kind: 'route',
      to: '/users/invite',
    })
  })

  it('is an address in another app at its origin', () => {
    expect(appLink('projects', '/projects/new', 'admin', origins)).toEqual({
      kind: 'url',
      href: 'https://projects.example.test/projects/new',
    })
  })

  it('is nowhere for an app this build has no origin for', () => {
    expect(appLink('reports', '/reports', 'admin', origins)).toBeNull()
  })

  it('follows only a path, never an address', () => {
    expect(appLink('admin', 'https://elsewhere.example.test/x', 'admin', origins)).toBeNull()
    expect(appLink('admin', '//elsewhere.example.test/x', 'admin', origins)).toBeNull()
  })
})
