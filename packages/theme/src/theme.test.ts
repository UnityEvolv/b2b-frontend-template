import { describe, expect, it } from 'vitest'

import { isThemePreference, pickThemed, resolveTheme } from './index'

describe('theme', () => {
  it('follows the system only when asked to', () => {
    expect(resolveTheme('system', true)).toBe('dark')
    expect(resolveTheme('system', false)).toBe('light')
    expect(resolveTheme('light', true)).toBe('light')
    expect(resolveTheme('dark', false)).toBe('dark')
  })

  it('falls back to the light variant when there is no dark one', () => {
    expect(pickThemed({ light: 'day.png', dark: 'night.png' }, 'dark')).toBe('night.png')
    expect(pickThemed({ light: 'day.png' }, 'dark')).toBe('day.png')
    expect(pickThemed({ light: 'day.png', dark: null }, 'dark')).toBe('day.png')
    expect(pickThemed({ light: 'day.png', dark: 'night.png' }, 'light')).toBe('day.png')
  })

  it('recognises a stored preference', () => {
    expect(isThemePreference('dark')).toBe(true)
    expect(isThemePreference('sepia')).toBe(false)
    expect(isThemePreference(null)).toBe(false)
  })
})
