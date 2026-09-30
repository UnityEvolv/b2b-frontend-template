import { describe, expect, it } from 'vitest'

import { qrShape, QUIET } from './qr'

describe('the authenticator QR code', () => {
  it('draws the finder pattern in the corner, inside the quiet zone', () => {
    const shape = qrShape('otpauth://totp/Example:ada%40example.com?secret=JBSWY3DPEHPK3PXP')
    // Version 3 or more for a link this long: at least 29 modules a side.
    expect(shape.size).toBeGreaterThanOrEqual(29)
    // The top-left finder's first row is seven dark modules.
    for (let col = 0; col < 7; col++) {
      expect(shape.path).toContain(`M${col + QUIET} ${QUIET}h1v1h-1z`)
    }
    // And the module just past it is light.
    expect(shape.path).not.toContain(`M${7 + QUIET} ${QUIET}h1v1h-1z`)
  })
})
