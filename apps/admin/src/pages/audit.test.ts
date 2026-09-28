import { describe, expect, it } from 'vitest'

import { auditQuery, membershipOf, readAuditView, writeAuditView } from './audit'

describe('the audit view', () => {
  it('lives in the URL, so a view can be linked to and reloaded', () => {
    const view = readAuditView(
      new URLSearchParams('target_type=membership&target_id=m-1&order=oldest'),
    )
    expect(view).toMatchObject({
      targetType: 'membership',
      targetId: 'm-1',
      order: 'oldest',
      action: '',
    })
    expect(writeAuditView(view).toString()).toBe(
      'target_type=membership&target_id=m-1&order=oldest',
    )
    // Newest first is the default, and is not written out.
    expect(writeAuditView({ ...view, order: 'newest' }).has('order')).toBe(false)
  })

  it('asks for whole days where the viewer is', () => {
    const query = auditQuery({
      ...readAuditView(new URLSearchParams()),
      from: '2026-09-01',
      to: '2026-09-02',
    })
    expect(new Date(query.from!).getDate()).toBe(1)
    expect(new Date(query.from!).getHours()).toBe(0)
    // Up to the start of the day after the last one.
    expect(new Date(query.to!).getDate()).toBe(3)
    expect(auditQuery(readAuditView(new URLSearchParams()))).toEqual({})
  })

  it('knows a membership actor from a service one', () => {
    expect(membershipOf('membership:abc')).toBe('abc')
    expect(membershipOf('system:organization')).toBeNull()
  })
})
