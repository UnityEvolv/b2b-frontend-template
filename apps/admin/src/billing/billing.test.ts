import { describe, expect, it } from 'vitest'

import { daysUntil, money, offeredBands } from './billing'

describe('billing helpers', () => {
  it('formats minor units as money in the reader language', () => {
    expect(money(4900, 'usd', 'en-US')).toBe('$49.00')
    expect(money(0, 'eur', 'en-US')).toBe('€0.00')
  })

  it('falls back when the currency is not one Intl knows', () => {
    expect(money(150, 'x', 'en-US')).toBe('1.50 X')
  })

  it('counts whole days up, never below zero', () => {
    const now = Date.parse('2026-09-26T00:00:00Z')
    expect(daysUntil('2026-09-30T00:00:00Z', now)).toBe(4)
    expect(daysUntil('2026-09-26T01:00:00Z', now)).toBe(1)
    expect(daysUntil('2026-09-20T00:00:00Z', now)).toBe(0)
  })

  it('offers every band billing lists, lowest first, the unpriced one too, never the current band', () => {
    expect(
      offeredBands({ band: 'team', bands: ['free', 'team', 'business'], next_band: 'business' }),
    ).toEqual(['free', 'business'])
    expect(offeredBands({ band: 'free', bands: ['free', 'team'], next_band: 'team' })).toEqual([
      'team',
    ])
    // A product's ladder starts where it likes; the band above is offered even when unlisted.
    expect(offeredBands({ band: 'starter', bands: ['starter'], next_band: 'growth' })).toEqual([
      'growth',
    ])
  })
})
