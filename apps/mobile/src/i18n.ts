import { createI18n, pickLanguage, type Resources } from '@b2b-template/i18n'

/**
 * Translation keys are checked by the compiler on the phone as on web: the
 * same resources, the same namespaces. A screen asks for `mobile:` keys for
 * what only the phone says, and shares `common:` and `account:` for the rest.
 */
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common'
    resources: Resources
  }
}

/** The device's languages, from the platform's Intl. */
function deviceLanguages(): string[] {
  try {
    return [Intl.DateTimeFormat().resolvedOptions().locale]
  } catch {
    return []
  }
}

/** The namespaces a phone screen reads: its own, and the shared ones it reuses. */
export const NS = ['common', 'mobile', 'account'] as const

export function mobileI18n(saved: string | null = null) {
  return createI18n(pickLanguage(saved, deviceLanguages()))
}
