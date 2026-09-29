export interface Product {
  readonly productName: string
  readonly storagePrefix: string
  readonly urlScheme: string
}

export declare const PRODUCT: Product
export declare function storageKey(name: string): string
export declare function recoveryCodesFile(): string
