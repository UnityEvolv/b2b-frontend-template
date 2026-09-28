import { create } from 'qrcode'

/**
 * An otpauth link as a QR code (UO-92), as one SVG path of dark squares.
 * The same library web draws its code with; here only its matrix is used,
 * because a phone has no canvas. Pure, so it is tested without a device.
 */
export interface QrShape {
  /** Modules per side, before the quiet zone. */
  size: number
  /** One square per dark module, offset by the quiet zone. */
  path: string
}

/** Modules of light margin around the code, which scanners need. */
export const QUIET = 2

export function qrShape(text: string): QrShape {
  const { modules } = create(text, { errorCorrectionLevel: 'M' })
  const size = modules.size
  let path = ''
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      if (modules.get(row, col)) path += `M${col + QUIET} ${row + QUIET}h1v1h-1z`
    }
  }
  return { size, path }
}
