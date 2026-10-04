import { describe, expect, it } from 'vitest'

import { EMPTY_FORM, formFrom, overrideRequest, overrideTargets, toDateInput } from './overrides'

const catalogue = {
  limits: [
    { key: 'users', label: 'users' },
    { key: 'projects', label: '' },
  ],
  features: [{ key: 'api_access', label: 'API access' }],
}
const targets = overrideTargets(catalogue)
const now = new Date('2026-10-05T12:00:00')

describe('what an override can be set on', () => {
  it('is every registered limit then feature, by the catalogue’s label or the key humanized', () => {
    expect(targets.map((t) => [t.value, t.label])).toEqual([
      ['limit:users', 'users'],
      ['limit:projects', 'projects'],
      ['feature:api_access', 'API access'],
    ])
    expect(overrideTargets(null)).toEqual([])
  })
})

describe('the override form’s request', () => {
  it('refuses anything not in the catalogue: there are no free-text keys', () => {
    expect(overrideRequest({ ...EMPTY_FORM, target: '' }, targets, now)).toEqual({
      error: 'target',
    })
    expect(
      overrideRequest({ ...EMPTY_FORM, target: 'limit:seats', cap: '5' }, targets, now),
    ).toEqual({ error: 'target' })
  })

  it('takes a whole cap of 1 or more, or no cap as 0', () => {
    const limit = { ...EMPTY_FORM, target: 'limit:users' }
    for (const cap of ['', '0', '-3', '2.5', 'ten'])
      expect(overrideRequest({ ...limit, cap }, targets, now)).toEqual({ error: 'cap' })
    expect(overrideRequest({ ...limit, cap: ' 75 ' }, targets, now)).toEqual({
      kind: 'limit',
      key: 'users',
      body: { cap: 75 },
    })
    expect(overrideRequest({ ...limit, cap: 'ignored', noCap: true }, targets, now)).toEqual({
      kind: 'limit',
      key: 'users',
      body: { cap: 0 },
    })
  })

  it('grants or takes a feature away, never sending a cap', () => {
    const feature = { ...EMPTY_FORM, target: 'feature:api_access', cap: '9' }
    expect(overrideRequest(feature, targets, now)).toEqual({
      kind: 'feature',
      key: 'api_access',
      body: { allowed: true },
    })
    expect(overrideRequest({ ...feature, allowed: 'false' }, targets, now)).toEqual({
      kind: 'feature',
      key: 'api_access',
      body: { allowed: false },
    })
  })

  it('ends at the close of the last day given, which must not have passed', () => {
    const form = { ...EMPTY_FORM, target: 'feature:api_access' }
    expect(overrideRequest({ ...form, endsOn: '2026-10-04' }, targets, now)).toEqual({
      error: 'endsOn',
    })
    expect(overrideRequest({ ...form, endsOn: 'soon' }, targets, now)).toEqual({ error: 'endsOn' })
    // Today still counts: it applies to the end of it.
    expect(overrideRequest({ ...form, endsOn: '2026-10-05' }, targets, now)).toEqual({
      kind: 'feature',
      key: 'api_access',
      body: { allowed: true, ends_at: new Date('2026-10-05T23:59:59').toISOString() },
    })
  })

  it('fills from an override to edit it', () => {
    const ends = new Date('2027-01-31T23:59:59').toISOString()
    expect(
      formFrom({ kind: 'limit', key: 'users', cap: 0, ends_at: ends, in_force: true }),
    ).toEqual({ ...EMPTY_FORM, target: 'limit:users', noCap: true, endsOn: '2027-01-31' })
    expect(formFrom({ kind: 'feature', key: 'scim', allowed: false, in_force: false })).toEqual({
      ...EMPTY_FORM,
      target: 'feature:scim',
      allowed: 'false',
    })
    expect(toDateInput(new Date('2027-03-04T10:00:00'))).toBe('2027-03-04')
  })
})
