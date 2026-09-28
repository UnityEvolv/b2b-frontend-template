import { describe, expect, it } from 'vitest'

import { afterLeaving, canSwitch, leaveBlocked } from './orgs'

const org = (orgId: string, active = false) => ({ orgId, name: orgId, role: 'user', active })

describe('moving between organizations and leaving one', () => {
  it('hides the switcher with one organization', () => {
    expect(canSwitch([org('a', true)])).toBe(false)
    expect(canSwitch([org('a', true), org('b')])).toBe(true)
  })

  it('asks an Owner to transfer ownership first', () => {
    expect(leaveBlocked('owner')).toBe('owner')
    expect(leaveBlocked('admin')).toBeNull()
  })

  it('signs out after the last one, moves into the only other, else asks', () => {
    expect(afterLeaving(0, [org('a', true)], 'a')).toEqual({ kind: 'signed-out' })
    expect(afterLeaving(1, [org('a', true), org('b')], 'a')).toEqual({
      kind: 'switch',
      orgId: 'b',
    })
    expect(afterLeaving(2, [org('a', true), org('b'), org('c')], 'a')).toEqual({ kind: 'choose' })
  })
})
