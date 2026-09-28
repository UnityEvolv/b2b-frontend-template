import type { identity } from '@b2b-template/api'
import { formatDateTime } from '@b2b-template/core'
import { useSession } from '@b2b-template/client'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { NS } from '../i18n'
import { useLocale } from '../locale'
import { requireAuth } from '../services'
import { Badge, Banner, Body, Button, Icon, Loading, Row, Screen } from '../ui'

type Session = identity.components['schemas']['Session']

/**
 * Where the person is signed in (UO-91): every session, this phone marked,
 * and signing out of all the others at once. Signing out here ends this
 * phone's session only.
 */
export function SessionsScreen({ onBack }: { onBack: () => void }) {
  const { t } = useTranslation(NS)
  const locale = useLocale()
  const auth = requireAuth()
  const { signOut } = useSession()
  const [sessions, setSessions] = useState<Session[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [message, setMessage] = useState<{ tone: 'ok' | 'danger'; text: string } | null>(null)
  const [attempt, setAttempt] = useState(0)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let current = true
    void auth.api.identity.GET('/v1/sessions').then(({ data }) => {
      if (!current) return
      setFailed(!data)
      setSessions(data?.sessions ?? [])
    })
    return () => {
      current = false
    }
  }, [auth, attempt])

  const signOutOthers = async () => {
    setBusy(true)
    const { error } = await auth.api.identity.DELETE('/v1/sessions')
    setBusy(false)
    if (error) {
      setMessage({ tone: 'danger', text: t('account:profile.sessionsFailed') })
      return
    }
    setMessage({ tone: 'ok', text: t('account:profile.othersSignedOut') })
    setAttempt((n) => n + 1)
  }

  if (!sessions) return <Loading label={t('loading')} />
  const others = sessions.filter((s) => !s.current).length

  return (
    <Screen title={t('account:profile.sessions')} onBack={onBack} backLabel={t('mobile:back')}>
      {message ? <Banner tone={message.tone}>{message.text}</Banner> : null}
      {failed ? (
        <>
          <Banner tone="danger">{t('mobile:sessions.failed')}</Banner>
          <Button label={t('retry')} variant="secondary" onPress={() => setAttempt((n) => n + 1)} />
        </>
      ) : null}
      {sessions.map((s) => (
        <Row
          key={s.session_id}
          title={s.user_agent || t('account:profile.unknownDevice')}
          subtitle={
            s.current
              ? null
              : t('mobile:sessions.lastSeen', {
                  when: formatDateTime(s.last_seen_at, locale),
                })
          }
          leading={<Icon name={s.current ? 'check' : 'clock'} />}
          trailing={
            s.current ? <Badge label={t('mobile:sessions.thisPhone')} tone="accent" /> : null
          }
        />
      ))}
      {others > 0 ? (
        <Button
          label={t('account:profile.signOutOthers')}
          variant="secondary"
          busy={busy}
          onPress={() => void signOutOthers()}
        />
      ) : (
        <Body muted>{t('mobile:sessions.onlyThis')}</Body>
      )}
      <Button
        label={t('account:profile.signOut')}
        variant="danger"
        icon="signOut"
        onPress={() => void signOut()}
      />
    </Screen>
  )
}
