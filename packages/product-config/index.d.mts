export interface Product {
  readonly productId: string
  readonly productName: string
  readonly storagePrefix: string
  readonly urlScheme: string
  readonly wordmark: readonly string[]
  readonly webSecurity: WebSecurity
}

/** The Content-Security-Policy fetch directives a product may add sources to. */
export type CspDirective =
  'connect' | 'script' | 'style' | 'img' | 'font' | 'media' | 'worker' | 'frame'

export interface WebSecurity {
  /** Extra sources per directive, beyond the strict default. */
  readonly origins: Readonly<Partial<Record<CspDirective, readonly string[]>>>
  /** Browser features the pages use, allowed on the app's own origin. */
  readonly permissions: readonly string[]
}

export declare const PRODUCT: Product
export declare function storageKey(name: string): string
export declare function recoveryCodesFile(): string
export declare function cookieName(name: string): string
