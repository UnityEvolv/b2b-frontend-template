/**
 * The session, kept in the operating system's keychain (UO-117).
 *
 * On the web the identity service keeps the session in an HttpOnly cookie
 * on its own host, and the browser holds it. Inside the shell the app is
 * served from its own scheme, which is another site to the API, so the
 * browser engine would neither send that SameSite=Lax cookie nor keep it
 * where it belongs. The shell holds it instead: every cookie the identity
 * service sets is taken off the response, kept encrypted with the keychain
 * (Electron's safeStorage: DPAPI on Windows, the Keychain on macOS), and
 * put back on each request to the identity service. It survives a restart;
 * signing out, which clears the cookie, clears it here too, and so does a
 * refresh the service refuses.
 *
 * Pure apart from what is injected, so the rules are tested.
 */

export interface VaultFile {
  read(): Buffer | null
  write(data: Buffer): void
  remove(): void
}

export interface VaultCrypto {
  /** False where there is no keychain to encrypt with: nothing is written to disk then. */
  available(): boolean
  encrypt(text: string): Buffer
  decrypt(data: Buffer): string
}

interface Kept {
  value: string
  /** Epoch milliseconds; null for a cookie that lasts as long as the session. */
  expiresAt: number | null
}

/** One Set-Cookie header, as far as keeping it goes. */
export interface SetCookie {
  name: string
  value: string
  /** Epoch milliseconds it expires at, or null for no expiry; in the past for a removal. */
  expiresAt: number | null
}

/** A Set-Cookie header, read; null when it is not one. */
export function readSetCookie(header: string, now: number): SetCookie | null {
  const [pair, ...attributes] = header.split(';')
  const eq = pair?.indexOf('=') ?? -1
  if (!pair || eq <= 0) return null
  const name = pair.slice(0, eq).trim()
  const value = pair.slice(eq + 1).trim()
  if (!/^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/.test(name)) return null
  let expiresAt: number | null = null
  let maxAgeSeen = false
  for (const attribute of attributes) {
    const [key = '', raw = ''] = attribute.split('=').map((part) => part.trim())
    const lower = key.toLowerCase()
    if (lower === 'max-age' && /^-?\d+$/.test(raw)) {
      // Max-Age wins over Expires (RFC 6265 5.3).
      maxAgeSeen = true
      const seconds = Number(raw)
      expiresAt = seconds <= 0 ? 0 : now + seconds * 1000
    } else if (lower === 'expires' && !maxAgeSeen) {
      const at = Date.parse(attribute.slice(attribute.indexOf('=') + 1).trim())
      if (!Number.isNaN(at)) expiresAt = at
    }
  }
  return { name, value, expiresAt }
}

/** Whether a request goes to the identity service. */
export function isIdentityRequest(url: string, identityUrl: string | null): boolean {
  if (!identityUrl) return false
  let target: URL
  let base: URL
  try {
    target = new URL(url)
    base = new URL(identityUrl)
  } catch {
    return false
  }
  if (target.origin !== base.origin) return false
  const prefix = base.pathname.replace(/\/$/, '')
  return prefix === '' || target.pathname === prefix || target.pathname.startsWith(`${prefix}/`)
}

/** A Cookie header with the kept cookies in it, over whatever the request already had. */
export function mergeCookieHeader(existing: string | undefined, kept: Record<string, string>) {
  const out = new Map<string, string>()
  for (const part of (existing ?? '').split(';')) {
    const eq = part.indexOf('=')
    if (eq > 0) out.set(part.slice(0, eq).trim(), part.slice(eq + 1).trim())
  }
  for (const [name, value] of Object.entries(kept)) out.set(name, value)
  return [...out].map(([name, value]) => `${name}=${value}`).join('; ')
}

export class SessionVault {
  #cookies = new Map<string, Kept>()

  constructor(
    private readonly file: VaultFile,
    private readonly crypto: VaultCrypto,
    private readonly now: () => number = Date.now,
  ) {}

  /** What was kept before the last quit. A file that cannot be read is dropped. */
  load(): void {
    this.#cookies.clear()
    if (!this.crypto.available()) return
    const data = this.file.read()
    if (!data) return
    try {
      const saved = JSON.parse(this.crypto.decrypt(data)) as Record<string, Kept>
      for (const [name, kept] of Object.entries(saved)) {
        if (typeof kept?.value !== 'string') continue
        const expiresAt = typeof kept.expiresAt === 'number' ? kept.expiresAt : null
        if (expiresAt === null || expiresAt > this.now())
          this.#cookies.set(name, { value: kept.value, expiresAt })
      }
    } catch {
      this.file.remove()
    }
  }

  /** The cookies to send now; expired ones are left out. */
  cookies(): Record<string, string> {
    const out: Record<string, string> = {}
    for (const [name, kept] of this.#cookies) {
      if (kept.expiresAt === null || kept.expiresAt > this.now()) out[name] = kept.value
    }
    return out
  }

  /** Keep what the identity service set, or forget what it cleared. */
  remember(headers: readonly string[]): void {
    let changed = false
    for (const header of headers) {
      const cookie = readSetCookie(header, this.now())
      if (!cookie) continue
      changed = true
      if (cookie.value === '' || (cookie.expiresAt !== null && cookie.expiresAt <= this.now()))
        this.#cookies.delete(cookie.name)
      else this.#cookies.set(cookie.name, { value: cookie.value, expiresAt: cookie.expiresAt })
    }
    if (changed) this.#save()
  }

  /** Forget the session altogether: signed out, or refused. */
  forget(): void {
    this.#cookies.clear()
    this.file.remove()
  }

  #save(): void {
    if (this.#cookies.size === 0) {
      this.file.remove()
      return
    }
    // Without a keychain the session lasts until quit, and never touches the disk.
    if (!this.crypto.available()) return
    this.file.write(this.crypto.encrypt(JSON.stringify(Object.fromEntries(this.#cookies))))
  }
}
