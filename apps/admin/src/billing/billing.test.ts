import { describe, expect, it } from 'vitest'

import { daysUntil, money } from './billing'

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
})
