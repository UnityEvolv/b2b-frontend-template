/**
 * @b2b-template/i18n
 *
 * The translation layer, from day one. Components never contain user-facing
 * text; they ask for it by key, and the build fails if they don't. English is
 * the only language today, and adding a second one is a new locale file and a
 * line in `SUPPORTED_LANGUAGES`, not a hunt through the code.
 *
 * No DOM here: the React Native app uses the same instance and the same
 * strings. Each platform supplies its own list of the device's languages.
 */
import { PRODUCT } from '@b2b-template/product-config'
import i18next, { type i18n } from 'i18next'

import { en, type Resources as CoreResources } from './locales/en'

export { en, type CoreResources }

/**
 * A product's own namespaces, beside the template's. A product declares
 * each by augmenting this interface next to its strings, and hands the
 * strings to its app definition's `locales`; the template never names them:
 *
 * ```ts
 * declare module '@b2b-template/i18n' {
 *   interface ProductResources {
 *     projects: typeof projects
 *   }
 * }
 * ```
 *
 * `t('projects:title')` is then checked by the compiler like the template's
 * own keys.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ProductResources {}

/** Every namespace: the template's, and those a product declares. */
export type Resources = CoreResources & ProductResources

export const SUPPORTED_LANGUAGES = ['en'] as const
export type Language = (typeof SUPPORTED_LANGUAGES)[number]
export const DEFAULT_LANGUAGE: Language = 'en'

/**
 * The variables any string may use without the caller passing them: `{{product}}`
 * is the product's name from the config. A call that passes options of its own
 * spreads these in, so the compiler sees every variable the string names.
 */
export const DEFAULT_VARIABLES = { product: PRODUCT.productName } as const

/** The template's namespaces. A product's are added by `createI18n`. */
export const NAMESPACES = Object.keys(en) as Array<keyof CoreResources>

/** A product's strings per language: English required, the others as they are translated. */
export type ProductLocales = { [L in typeof DEFAULT_LANGUAGE]: ProductResources } & {
  [L in Language]?: Partial<ProductResources>
}

const RESOURCES: Record<Language, CoreResources> = { en }

export const isSupportedLanguage = (value: string): value is Language =>
  (SUPPORTED_LANGUAGES as readonly string[]).includes(value)

/**
 * The language to show.
 *
 * The person's saved setting wins. Without one, the first of the device's
 * languages we support, matching `pt-BR` to `pt` when only `pt` exists. English
 * when nothing matches.
 */
export function pickLanguage(
  saved: string | null | undefined,
  device: readonly string[],
): Language {
  for (const candidate of [saved, ...device]) {
    if (!candidate) continue
    if (isSupportedLanguage(candidate)) return candidate
    const base = candidate.split('-')[0] ?? ''
    if (isSupportedLanguage(base)) return base
  }
  return DEFAULT_LANGUAGE
}

/**
 * A ready translation instance.
 *
 * Resources are bundled rather than fetched: the English strings are small, and
 * a shell that has to download its own error page's text cannot show that error
 * page when the network is the problem.
 */
export function createI18n(language: Language = DEFAULT_LANGUAGE, product?: ProductLocales): i18n {
  const instance = i18next.createInstance()
  // A product's namespaces sit beside the template's; one never replaces another.
  const resources = Object.fromEntries(
    SUPPORTED_LANGUAGES.map((lng) => [lng, { ...product?.[lng], ...RESOURCES[lng] }]),
  )
  void instance.init({
    lng: language,
    fallbackLng: DEFAULT_LANGUAGE,
    supportedLngs: [...SUPPORTED_LANGUAGES],
    ns: [...NAMESPACES, ...Object.keys(product?.[DEFAULT_LANGUAGE] ?? {})],
    defaultNS: 'common',
    resources,
    initAsync: false,
    // React escapes already; escaping twice shows `&amp;` to the reader.
    interpolation: {
      escapeValue: false,
      // `{{product}}` in any string is the product's name from the config.
      defaultVariables: DEFAULT_VARIABLES,
    },
    returnNull: false,
  })
  return instance
}
