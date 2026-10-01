import { describe, expect, it } from 'vitest'

import { desktopNotices, entryPath, type Entry } from './feed'

const entry = (id: string, read: boolean, link = '/settings/notifications'): Entry =>
  ({
    id,
    category: 'security',
    kind: 'new_sign_in',
    heading: 'New sign-in',
    line: '',
    data: {},
    link,
    count: 1,
    items: [],
    occurred_at: '2026-09-28T10:00:00Z',
    read,
  }) as Entry

describe('the feed', () => {
  it('keeps a link inside the app, and falls back to the home page', () => {
    expect(entryPath('/settings/notifications')).toBe('/settings/notifications')
    expect(entryPath('https://evil.example')).toBe('/')
    expect(entryPath('//evil.example')).toBe('/')
    expect(entryPath('/a\\b')).toBe('/')
  })

  it('makes a desktop notice of each unread entry not seen before', () => {
    const notices = desktopNotices(
      [entry('a', false), entry('b', true), entry('c', false, 'https://evil.example')],
      new Set(['a']),
      (e) => `summary ${e.id}`,
      'Open the app',
    )
    expect(notices).toEqual([{ title: 'summary c', body: 'Open the app', path: '/' }])
  })
})
