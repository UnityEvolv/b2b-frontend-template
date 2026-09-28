/**
 * The tray: a way back into the app when the window is not in front, signing
 * out, and quitting. Kept free of Electron so the menu's words and choices
 * are tested on their own; main.ts turns them into a real menu.
 */

/** One line of the tray menu. */
export type TrayItem =
  | { kind: 'open'; label: string }
  | { kind: 'sign-out'; label: string }
  | { kind: 'separator' }
  | { kind: 'quit'; label: string }

/** The menu: open the app, sign out, quit. */
export function trayItems(productName: string): TrayItem[] {
  return [
    { kind: 'open', label: `Open ${productName}` },
    { kind: 'sign-out', label: 'Sign out' },
    { kind: 'separator' },
    { kind: 'quit', label: 'Quit' },
  ]
}

/**
 * The tray icon, drawn rather than shipped: a filled circle on a transparent
 * square, as BGRA pixels for nativeImage.
 */
export function trayBitmap(size = 32): Buffer {
  const pixels = Buffer.alloc(size * size * 4)
  const centre = (size - 1) / 2
  const radius = size / 2 - 1
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const d = Math.hypot(x - centre, y - centre)
      // A soft edge: full inside, fading over the last pixel.
      const alpha = Math.max(0, Math.min(1, radius - d + 0.5))
      const at = (y * size + x) * 4
      pixels[at] = 0xe5 // blue
      pixels[at + 1] = 0x63 // green
      pixels[at + 2] = 0x4f // red
      pixels[at + 3] = Math.round(alpha * 255)
    }
  }
  return pixels
}
