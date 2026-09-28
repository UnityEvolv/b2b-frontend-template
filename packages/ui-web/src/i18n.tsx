import { pickLanguage, type Resources } from '@b2b-template/i18n'
import type { i18n } from 'i18next'
import { useLayoutEffect, type ReactNode } from 'react'
import { I18nextProvider } from 'react-i18next'

import { useSession } from './session'
import { readCache, writeCache } from './storage'

/**
 * Translation keys are checked by the compiler.
 *
 * `t('common:errors.notFound.title')` compiles; a typo does not. Declared here,
 * in a module every app imports, so the check reaches every app.
 */
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common'
    resources: Resources
  }
}

export const LANGUAGE_CACHE_KEY = 'unityofis:language'

/** The language to start in, before the session says otherwise. */
export function initialLanguage() {
  return pickLanguage(readCache(LANGUAGE_CACHE_KEY), navigator.languages ?? [navigator.language])
}

/**
 * Keeps the active language in step with the person's saved setting, and the
 * document's `lang` in step with the language, which is what a screen reader
 * uses to choose a voice.
 */
function LanguageSync({ i18n }: { i18n: i18n }) {
  const { state } = useSession()
  const saved = state.status === 'signed-in' ? state.session.user.preferences.language : null

  useLayoutEffect(() => {
    const language = pickLanguage(saved, navigator.languages ?? [navigator.language])
    if (i18n.language !== language) void i18n.changeLanguage(language)
    document.documentElement.lang = language
    writeCache(LANGUAGE_CACHE_KEY, language)
  }, [i18n, saved])

  return null
}

export function I18nProvider({ i18n, children }: { i18n: i18n; children: ReactNode }) {
  return (
    <I18nextProvider i18n={i18n}>
      <LanguageSync i18n={i18n} />
      {children}
    </I18nextProvider>
  )
}
