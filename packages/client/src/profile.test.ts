import { describe, expect, it } from 'vitest'

import { matchTimeZones, workingHours } from './profile'

describe('finding a time zone by typing', () => {
  const zones = ['America/New_York', 'Asia/Kolkata', 'Europe/London', 'Pacific/Auckland']
  it('puts a city that starts with the words first', () => {
    expect(matchTimeZones(zones, 'new york')).toEqual(['America/New_York'])
    expect(matchTimeZones(zones, 'a')).toEqual([
      'Pacific/Auckland',
      'America/New_York',
      'Asia/Kolkata',
    ])
    expect(matchTimeZones(zones, '')).toHaveLength(4)
  })
})

describe('workingHours', () => {
  it('clears them when no day is chosen', () => {
    expect(workingHours([], '', '')).toEqual({ value: null })
  })
  it('keeps the days in week order', () => {
    expect(workingHours(['fri', 'mon'], '09:00', '17:30')).toEqual({
      value: { days: ['mon', 'fri'], start: '09:00', end: '17:30' },
    })
  })
  it('refuses a malformed time and an end before the start', () => {
    expect(workingHours(['mon'], '9', '17:00')).toEqual({ error: 'hoursInvalid' })
    expect(workingHours(['mon'], '17:00', '09:00')).toEqual({ error: 'hoursOrder' })
  })
})
