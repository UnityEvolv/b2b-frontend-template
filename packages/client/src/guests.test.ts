import { describe, expect, it } from 'vitest'

import { canInviteGuest, DEFAULT_GUEST_WINDOW, GUEST_WINDOWS, grantIsOpen } from './guests'

describe('guest invites', () => {
  it('are offered to anyone but a guest, in a working or meeting room they are in', () => {
    expect(canInviteGuest('user', 'meeting', true)).toBe(true)
    expect(canInviteGuest('admin', 'workspace', true)).toBe(true)
    expect(canInviteGuest('guest', 'meeting', true)).toBe(false)
    expect(canInviteGuest('user', 'reception', true)).toBe(false)
    expect(canInviteGuest('user', 'break', true)).toBe(false)
    expect(canInviteGuest('user', 'meeting', false)).toBe(false)
  })

  it('last a week unless chosen otherwise, and stay open until withdrawn', () => {
    expect(GUEST_WINDOWS).toContain(DEFAULT_GUEST_WINDOW)
    expect(grantIsOpen('expired')).toBe(true)
    expect(grantIsOpen('revoked')).toBe(false)
  })
})
