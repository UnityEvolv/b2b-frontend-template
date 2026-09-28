import { describe, expect, it } from 'vitest'

import { landing } from './landing'
import { maskEmail, passwordAcceptable, passwordRules, safeNext } from './password'

const member = { membership: { orgId: 'o', membershipId: 'm', role: 'user' } }

describe('where a signed-in person lands', () => {
  it('shows the chooser when no organization is active yet', () => {
    expect(
      landing({ session: { chooseOrganization: true }, offices: [], lastOfficeId: null }),
    ).toEqual({ kind: 'choose-organization' })
  })

  it('goes back to the last office while it is still open', () => {
    const offices = [{ id: 'a', status: 'active' }, { id: 'b' }]
    expect(landing({ session: member, offices, lastOfficeId: 'b' })).toEqual({
      kind: 'office',
      officeId: 'b',
    })
    expect(
      landing({
        session: member,
        offices: [{ id: 'b', status: 'deactivated' }],
        lastOfficeId: 'b',
      }),
    ).toEqual({ kind: 'offices' })
    expect(landing({ session: member, offices, lastOfficeId: 'gone' })).toEqual({
      kind: 'offices',
    })
  })

  it('shows the list when the person asked for it', () => {
    expect(
      landing({ session: member, offices: [{ id: 'a' }], lastOfficeId: 'a', choosing: true }),
    ).toEqual({ kind: 'offices' })
  })
})

describe('the password rules as a person types', () => {
  it('asks for length and a matching repeat', () => {
    expect(passwordRules('short', 'short')).toEqual([
      { key: 'length', ok: false },
      { key: 'match', ok: true },
    ])
    expect(passwordAcceptable('a long enough one', 'a long enough one')).toBe(true)
    expect(passwordAcceptable('a long enough one', 'a long enough on')).toBe(false)
    expect(passwordRules('', '')[1]).toEqual({ key: 'match', ok: false })
  })

  it('masks an address the way the invite preview does', () => {
    expect(maskEmail('ada@example.com')).toBe('a***@example.com')
    expect(maskEmail('nope')).toBe('***')
  })

  it('keeps a return path inside the app', () => {
    expect(safeNext('/offices/1', '/offices')).toBe('/offices/1')
    expect(safeNext('//evil.example', '/offices')).toBe('/offices')
    expect(safeNext(null, '/offices')).toBe('/offices')
  })
})
