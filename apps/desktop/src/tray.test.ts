import { describe, expect, it } from 'vitest'

import { trayBitmap, trayItems } from './tray'

describe('the tray menu', () => {
  it('opens the app, signs out and quits', () => {
    expect(trayItems('B2B App')).toEqual([
      { kind: 'open', label: 'Open B2B App' },
      { kind: 'sign-out', label: 'Sign out' },
      { kind: 'separator' },
      { kind: 'quit', label: 'Quit' },
    ])
  })

  it('draws a round icon with transparent corners', () => {
    const pixels = trayBitmap(32)
    expect(pixels.length).toBe(32 * 32 * 4)
    expect(pixels[3]).toBe(0)
    expect(pixels[(16 * 32 + 16) * 4 + 3]).toBe(255)
  })
})
