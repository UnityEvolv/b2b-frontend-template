import { describe, expect, it } from 'vitest'

import { CONFIGURABLE, toggled } from './RolesPage'

describe('the permission matrix', () => {
  it('turns one group on or off for one role and leaves the other alone', () => {
    const config = { admin: ['users', 'audit'] as const, billing_admin: ['billing'] as const }
    const on = toggled(
      { admin: [...config.admin], billing_admin: [...config.billing_admin] },
      'admin',
      'billing',
      true,
    )
    expect(on).toEqual({ admin: ['users', 'audit', 'billing'], billing_admin: ['billing'] })
    expect(toggled(on, 'admin', 'billing', true).admin).toEqual(['users', 'audit', 'billing'])
    expect(toggled(on, 'billing_admin', 'billing', false)).toEqual({
      admin: ['users', 'audit', 'billing'],
      billing_admin: [],
    })
  })

  it('offers only the configurable groups, never the Owner-only actions', () => {
    expect(CONFIGURABLE).toEqual(['billing', 'users', 'audit'])
  })
})
