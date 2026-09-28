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
import i18next, { type i18n } from 'i18next'

import { en, type Resources } from './locales/en'

export { en, type Resources }

export const SUPPORTED_LANGUAGES = ['en'] as const
export type Language = (typeof SUPPORTED_LANGUAGES)[number]
export const DEFAULT_LANGUAGE: Language = 'en'

export const NAMESPACES = Object.keys(en) as Array<keyof Resources>

const RESOURCES: Record<Language, Resources> = { en }

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
export function createI18n(language: Language = DEFAULT_LANGUAGE): i18n {
  const instance = i18next.createInstance()
  void instance.init({
    lng: language,
    fallbackLng: DEFAULT_LANGUAGE,
    supportedLngs: [...SUPPORTED_LANGUAGES],
    ns: NAMESPACES,
    defaultNS: 'common',
    resources: RESOURCES,
    initAsync: false,
    // React escapes already; escaping twice shows `&amp;` to the reader.
    interpolation: { escapeValue: false },
    returnNull: false,
  })
  return instance
}
