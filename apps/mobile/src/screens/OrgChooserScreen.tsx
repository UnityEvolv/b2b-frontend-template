import { useSession, type OrgChoice } from '@b2b-template/client'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { NS } from '../i18n'
import { requireAuth } from '../services'
import { Banner, Body, Button, Icon, Loading, Row, Screen, Title } from '../ui'

/**
 * Several organizations and none active yet: the person chooses
 * where to start. Choosing moves the session's active membership on the
 * server; nothing else is asked, no second sign-in.
 */
export function OrgChooserScreen() {
  const { t } = useTranslation(NS)
  const auth = requireAuth()
  const { reload, signOut } = useSession()
  const [choices, setChoices] = useState<OrgChoice[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  useEffect(() => {
    let current = true
    auth.orgs.list().then(
      (list) => current && setChoices(list),
      () => current && setChoices([]),
    )
    return () => {
      current = false
    }
  }, [auth])

  const choose = async (orgId: string) => {
    setBusy(orgId)
    setError(null)
    try {
      await auth.orgs.switchTo(orgId)
      reload()
    } catch {
      setError(t('mobile:orgs.failed'))
      setBusy(null)
    }
  }

  if (!choices) return <Loading label={t('mobile:orgs.loading')} />
  return (
    <Screen>
      <Title>{t('mobile:orgs.title')}</Title>
      <Body muted>{t('mobile:orgs.intro')}</Body>
      {error ? <Banner tone="danger">{error}</Banner> : null}
      {choices.length === 0 ? <Banner tone="info">{t('mobile:orgs.none')}</Banner> : null}
      {choices.map((choice) => (
        <Row
          key={choice.orgId}
          title={choice.name}
          subtitle={t('mobile:orgs.role', { role: t(`roles.${choice.role}` as 'roles.user') })}
          onPress={() => void choose(choice.orgId)}
          disabled={busy !== null}
          leading={<Icon name="building" />}
          trailing={<Icon name="forward" />}
        />
      ))}
      <Button label={t('signOut')} variant="ghost" onPress={() => void signOut()} />
    </Screen>
  )
}
