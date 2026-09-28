import { memorySessionSource, SessionProvider, useSession } from '@b2b-template/client'
import { pickLanguage } from '@b2b-template/i18n'
import { StatusBar } from 'expo-status-bar'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { I18nextProvider, useTranslation } from 'react-i18next'
import { SafeAreaProvider } from 'react-native-safe-area-context'

import { mobileI18n, NS } from './i18n'
import { LinkOverlay } from './LinkOverlay'
import { NoticeContext, type SignedOutNotice } from './notice'
import { useIncomingLink } from './platform/incoming'
import { PublicFlow, publicRouteFor } from './Public'
import { OrgChooserScreen } from './screens/OrgChooserScreen'
import { auth } from './services'
import { Shell } from './Shell'
import { Banner, Button, Loading, Screen, ThemeRoot, Title, useTheme } from './ui'

/** A build with no API address signs nobody in and says why. */
const nobody = memorySessionSource(null)

/**
 * The phone app (UO-89): the same session as web, from the same provider,
 * over a source whose session cookie lives in the keystore. Signed out, the
 * sign-in screen; several organizations and none chosen, the chooser;
 * otherwise the app.
 */
export function App() {
  const i18n = useMemo(() => mobileI18n(), [])
  return (
    <SafeAreaProvider>
      <I18nextProvider i18n={i18n}>
        <SessionProvider source={auth?.sessionSource ?? nobody}>
          <Themed />
        </SessionProvider>
      </I18nextProvider>
    </SafeAreaProvider>
  )
}

function Themed() {
  const { state } = useSession()
  const { i18n } = useTranslation()
  const preferences = state.status === 'signed-in' ? state.session.user.preferences : null
  const language = preferences?.language ?? null

  // The person's saved language wins over the device's, as on web.
  useEffect(() => {
    const wanted = pickLanguage(language, [i18n.language])
    if (wanted !== i18n.language) void i18n.changeLanguage(wanted)
  }, [language, i18n])

  return (
    <ThemeRoot preference={preferences?.theme ?? 'system'}>
      <Bar />
      <Root />
    </ThemeRoot>
  )
}

function Bar() {
  return <StatusBar style={useTheme() === 'dark' ? 'light' : 'dark'} />
}

function Root() {
  const { t } = useTranslation(NS)
  const { state } = useSession()
  // A link from an email (UO-90): signed out, it starts the signed-out
  // screens where it points; signed in, it opens over the app.
  const link = useIncomingLink()
  // Why the app signed the person out, when it did: said on the sign-in screen.
  // The serial moves when one is set, not when it is spent, so spending it
  // does not start the sign-in screen again.
  const [notice, setNoticeState] = useState<{ kind: SignedOutNotice | null; serial: number }>({
    kind: null,
    serial: 0,
  })
  const setNotice = useCallback(
    (kind: SignedOutNotice) => setNoticeState((n) => ({ kind, serial: n.serial + 1 })),
    [],
  )
  const clearNotice = useCallback(
    () => setNoticeState((n) => ({ kind: null, serial: n.serial })),
    [],
  )

  if (!auth) {
    return (
      <Screen>
        <Title>{t('mobile:title')}</Title>
        <Banner tone="danger">{t('mobile:notConfigured')}</Banner>
      </Screen>
    )
  }
  switch (state.status) {
    case 'loading':
      return <Loading label={t('mobile:starting')} />
    case 'error':
      return (
        <Screen>
          <Banner tone="danger">{t('mobile:sessionError')}</Banner>
          <Button label={t('retry')} onPress={state.retry} />
        </Screen>
      )
    case 'signed-out':
      return (
        <PublicFlow
          key={`${link.serial}:${notice.serial}`}
          start={
            publicRouteFor(link.target) ??
            (notice.kind ? { name: 'sign-in', notice: notice.kind } : null)
          }
          onStarted={() => {
            link.clear()
            clearNotice()
          }}
        />
      )
    case 'signed-in':
      return (
        <NoticeContext.Provider value={setNotice}>
          {state.session.membership ? <Shell /> : <OrgChooserScreen />}
          {link.target ? <LinkOverlay target={link.target} onClose={link.clear} /> : null}
        </NoticeContext.Provider>
      )
  }
}
