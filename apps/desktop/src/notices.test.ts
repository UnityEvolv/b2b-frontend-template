import { describe, expect, it } from 'vitest'

import { isAppPath, readNotice, shouldNotify } from './notices'

describe('system notifications', () => {
  it('takes a title, a body and a page in the app to open', () => {
    expect(
      readNotice({ title: 'Mentioned', body: 'In the report.', path: '/settings/notifications' }),
    ).toEqual({ title: 'Mentioned', body: 'In the report.', path: '/settings/notifications' })
  })

  it('drops anything else: empty titles, pages outside the app', () => {
    const ok = { title: 'New', body: 'b', path: '/profile' }
    expect(readNotice({ ...ok, title: ' ' })).toBeNull()
    expect(readNotice({ ...ok, body: 3 })).toBeNull()
    expect(readNotice({ ...ok, path: 'https://evil.example' })).toBeNull()
    expect(readNotice({ ...ok, path: '//evil.example' })).toBeNull()
    expect(readNotice({ ...ok, path: 'javascript:alert(1)' })).toBeNull()
    expect(readNotice(null)).toBeNull()
    expect(readNotice({ ...ok, title: 'x'.repeat(500) })?.title).toHaveLength(120)
    expect(isAppPath('/profile?tab=a%20b')).toBe(true)
    expect(isAppPath('/a\\b')).toBe(false)
  })

  it('is shown only while the person is not looking at the app', () => {
    expect(shouldNotify({ visible: true, focused: true })).toBe(false)
    expect(shouldNotify({ visible: true, focused: false })).toBe(true)
    expect(shouldNotify({ visible: false, focused: false })).toBe(true)
    expect(shouldNotify(null)).toBe(true)
  })
})
