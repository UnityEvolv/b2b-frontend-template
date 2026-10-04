import { describe, expect, it } from 'vitest'

import { appFor, supportUrl, wayIn, type Grant, type Standing } from './support'

const NOW = Date.parse('2026-10-05T12:00:00Z')

const grant = (fields: Partial<Grant>): Grant => ({
  id: 'g-1',
  org_id: 'acme',
  granted_by: 'membership:m-owner',
  created_at: '2026-10-05T11:00:00Z',
  expires_at: '2026-10-05T13:00:00Z',
  include_owners: false,
  active: true,
  ...fields,
})

const standing = (fields: Partial<Standing> = {}): Standing => ({
  org_id: 'acme',
  standing: true,
  include_owners: false,
  ...fields,
})

describe('whether support may see as someone', () => {
  it('uses the open consent that lasts longest', () => {
    const grants = [
      grant({ id: 'short', expires_at: '2026-10-05T12:30:00Z' }),
      grant({ id: 'long', expires_at: '2026-10-05T20:00:00Z' }),
      grant({ id: 'revoked', expires_at: '2026-10-06T00:00:00Z', active: false }),
      grant({ id: 'past', expires_at: '2026-10-05T11:59:00Z' }),
    ]
    expect(wayIn('admin', grants, undefined, NOW)).toEqual({
      kind: 'consent',
      grantId: 'long',
      until: '2026-10-05T20:00:00Z',
    })
  })

  it('reaches an Owner only when the consent includes Owners', () => {
    expect(wayIn('owner', [grant({})], undefined, NOW)).toBeNull()
    expect(wayIn('owner', [grant({ include_owners: true })], undefined, NOW)?.kind).toBe('consent')
    expect(wayIn('user', [grant({})], undefined, NOW)?.kind).toBe('consent')
  })

  it('falls back to standing access, Owners only when it includes them', () => {
    expect(wayIn('user', [], standing(), NOW)).toEqual({ kind: 'standing' })
    expect(wayIn('owner', [], standing(), NOW)).toBeNull()
    expect(wayIn('owner', [], standing({ include_owners: true }), NOW)).toEqual({
      kind: 'standing',
    })
    expect(wayIn('user', [], standing({ standing: false }), NOW)).toBeNull()
    // A consent that leaves Owners out does not hide standing access that includes them.
    expect(wayIn('owner', [grant({})], standing({ include_owners: true }), NOW)).toEqual({
      kind: 'standing',
    })
  })

  it('opens the admin app for the roles it admits, the account app otherwise', () => {
    expect(appFor('owner')).toBe('admin')
    expect(appFor('billing_admin')).toBe('admin')
    expect(appFor('user')).toBe('account')
    expect(appFor('guest')).toBe('account')
    expect(supportUrl('https://admin.example.test/')).toBe('https://admin.example.test/?support=1')
  })
})
