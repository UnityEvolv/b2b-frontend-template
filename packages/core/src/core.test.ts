import { describe, expect, it } from 'vitest'

import {
  displayName,
  formatDateTime,
  formatRelative,
  initials,
  isValidTimeZone,
  noPermissions,
  permissionsFrom,
  timeZoneLabel,
} from './index'

describe('permissions', () => {
  type P = 'users.invite' | 'users.remove' | 'offices.create'
  const admin = permissionsFrom<P>(['users.invite', 'offices.create'])

  it('answers from the set the server sent', () => {
    expect(admin.can('users.invite')).toBe(true)
    expect(admin.can('users.remove')).toBe(false)
    expect(admin.canAll('users.invite', 'offices.create')).toBe(true)
    expect(admin.canAll('users.invite', 'users.remove')).toBe(false)
    expect(admin.canAny('users.remove', 'offices.create')).toBe(true)
  })

  it('allows nothing without a session', () => {
    expect(noPermissions.canAny()).toBe(false)
  })
})

describe('names', () => {
  it('uses the name as typed, falling back to the email', () => {
    expect(displayName({ displayName: '  Asha Rao ', email: 'asha@example.org' })).toBe('Asha Rao')
    expect(displayName({ displayName: '', email: 'asha@example.org' })).toBe('asha')
    expect(displayName({ email: 'x' })).toBe('x')
  })

  it('takes whole characters for initials', () => {
    expect(initials({ displayName: 'asha rao', email: 'a@x' })).toBe('AR')
    expect(initials({ displayName: 'Émile', email: 'e@x' })).toBe('É')
    expect(initials({ displayName: '𝒜da Lovelace', email: 'a@x' })).toBe('𝒜L')
    expect(initials({ displayName: 'Mary Ann de la Cruz', email: 'm@x' })).toBe('MC')
  })
})

describe('dates', () => {
  const moment = '2026-09-23T09:30:00Z'

  it('formats in the zone given, not the device zone', () => {
    expect(formatDateTime(moment, { locale: 'en-GB', timeZone: 'Asia/Kolkata' })).toBe(
      '23 Sept 2026, 15:00',
    )
    expect(formatDateTime(moment, { locale: 'en-US', timeZone: 'America/Los_Angeles' })).toBe(
      'Sep 23, 2026, 2:30 AM',
    )
  })

  it('labels a zone by its offset at that moment', () => {
    expect(timeZoneLabel(moment, { locale: 'en-US', timeZone: 'America/Los_Angeles' })).toBe('PDT')
    expect(
      timeZoneLabel('2026-01-15T09:30:00Z', { locale: 'en-US', timeZone: 'America/Los_Angeles' }),
    ).toBe('PST')
  })

  it('knows a real zone from a typo', () => {
    expect(isValidTimeZone('Europe/Berlin')).toBe(true)
    expect(isValidTimeZone('Europe/Berln')).toBe(false)
  })

  it('says how long ago, from the now it is given', () => {
    const now = '2026-09-23T10:00:00Z'
    expect(formatRelative('2026-09-23T09:55:00Z', now, { locale: 'en' })).toBe('5 minutes ago')
    expect(formatRelative('2026-09-25T10:00:00Z', now, { locale: 'en' })).toBe('in 2 days')
    expect(formatRelative('2026-09-22T10:00:00Z', now, { locale: 'en' })).toBe('yesterday')
  })
})
