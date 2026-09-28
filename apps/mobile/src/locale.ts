import { deviceTimeZone } from '@b2b-template/client'
import type { Locale } from '@b2b-template/core'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

/**
 * The locale and zone a phone screen formats times in: the language the app
 * is showing, and the phone's own zone, which is where its owner is now.
 */
export function useLocale(): Locale {
  const { i18n } = useTranslation()
  return useMemo(() => ({ locale: i18n.language, timeZone: deviceTimeZone() }), [i18n.language])
}
