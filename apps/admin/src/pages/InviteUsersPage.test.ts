import { assignableRoles } from '@b2b-template/ui-web'
import { describe, expect, it } from 'vitest'

import { parseAddresses } from './InviteUsersPage'

describe('inviting', () => {
  it('reads addresses however they were pasted', () => {
    expect(parseAddresses(' a@x.test, b@x.test;c@x.test\n\nd@x.test  ')).toEqual([
      'a@x.test',
      'b@x.test',
      'c@x.test',
      'd@x.test',
    ])
    expect(parseAddresses('   ')).toEqual([])
  })

  it('offers only the roles the inviter may hand out, never Owner or Guest', () => {
    expect(assignableRoles('owner')).toEqual(['admin', 'billing_admin', 'user'])
    expect(assignableRoles('admin')).toEqual(['user'])
    expect(assignableRoles('billing_admin')).toEqual([])
    expect(assignableRoles('user')).toEqual([])
  })
})
