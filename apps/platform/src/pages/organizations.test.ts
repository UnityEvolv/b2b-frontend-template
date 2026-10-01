import { describe, expect, it } from 'vitest'

import {
  isBandName,
  looksLikeEmail,
  normalizeDomain,
  planChoices,
  readView,
  writeView,
} from './organizations'

describe('the list view in the URL', () => {
  it('reads defaults from an empty URL and writes nothing back', () => {
    const view = readView(new URLSearchParams())
    expect(view).toEqual({
      q: '',
      plan: '',
      status: '',
      sort: 'created_at',
      order: 'desc',
      limit: 50,
      pages: [],
    })
    expect(writeView(view).toString()).toBe('')
  })
  it('round-trips a shared view', () => {
    const url = 'q=acme&plan=business&status=suspended&sort=name&order=desc&limit=100&pages=a%2Cb'
    expect(writeView(readView(new URLSearchParams(url))).toString()).toBe(url)
  })
  it('ignores values it does not know', () => {
    const view = readView(new URLSearchParams('plan=%3Cgold%3E&status=gone&limit=7&order=up'))
    expect(view.plan).toBe('')
    expect(view.status).toBe('')
    expect(view.limit).toBe(50)
    expect(view.order).toBe('desc')
  })
})

describe('plan bands', () => {
  it('takes any name a registry could give a band, a product’s too', () => {
    expect(isBandName('team')).toBe(true)
    expect(isBandName('enterprise-contractual')).toBe(true)
    expect(isBandName('scale_up')).toBe(true)
    expect(isBandName('')).toBe(false)
    expect(isBandName('a band')).toBe(false)
  })
  it('offers the catalogue’s bands by label, and keeps one the view names that it lacks', () => {
    const bands = [
      { name: 'free', label: 'Free', contractual: false, limits: {}, features: [] },
      { name: 'enterprise', label: '', contractual: true, limits: {}, features: [] },
    ]
    expect(planChoices({ bands }, '')).toEqual([
      { name: 'free', label: 'Free', contractual: false },
      { name: 'enterprise', label: 'Enterprise', contractual: true },
    ])
    expect(planChoices({ bands }, 'legacy_gold').at(-1)).toEqual({
      name: 'legacy_gold',
      label: 'Legacy gold',
      contractual: false,
    })
    expect(planChoices(null, '')).toEqual([])
  })
})

describe('domain and email checks', () => {
  it('normalizes a domain and refuses what cannot be one', () => {
    expect(normalizeDomain(' @Acme.COM ')).toBe('acme.com')
    expect(normalizeDomain('')).toBe('')
    expect(normalizeDomain('acme')).toBeNull()
    expect(normalizeDomain('http://acme.com')).toBeNull()
  })
  it('accepts a plausible address only', () => {
    expect(looksLikeEmail('ada@acme.com')).toBe(true)
    expect(looksLikeEmail('ada@acme')).toBe(false)
  })
})
