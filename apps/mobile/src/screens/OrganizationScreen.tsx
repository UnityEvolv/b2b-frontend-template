import {
  afterLeaving,
  canSwitch,
  leaveBlocked,
  useSession,
  type OrgChoice,
} from '@b2b-template/client'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Alert, View } from 'react-native'

import { NS } from '../i18n'
import { useSignedOutNotice } from '../notice'
import { apiMessage, useOrg } from '../org'
import { requireAuth } from '../services'
import { Badge, Banner, Body, Button, Icon, Loading, Row, Screen, Section } from '../ui'

/**
 * The person's organizations (UO-114), by the same rules as web: the
 * switcher only when there is somewhere else to go; switching moves the
 * session's active membership without signing in again, and everything
 * reloads from it.
 * Leaving: an Owner transfers ownership first; leaving the last one signs
 * the person out and says why.
 */
export function OrganizationScreen({ onBack }: { onBack: () => void }) {
  const { t } = useTranslation(NS)
  const auth = requireAuth()
  const org = useOrg()
  const { reload, signOut } = useSession()
  const announce = useSignedOutNotice()
  const [choices, setChoices] = useState<OrgChoice[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

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

  if (!org || !choices) return <Loading label={t('mobile:orgs.loading')} />
  const here = choices.find((c) => c.orgId === org.orgId)
  const blocked = leaveBlocked(org.role)

  const switchTo = async (orgId: string) => {
    setBusy(true)
    setError(null)
    try {
      await auth.orgs.switchTo(orgId)
      // Everything reloads from the new membership: the screens and
      // the permissions.
      reload()
    } catch {
      setError(t('orgs.switchFailed'))
      setBusy(false)
    }
  }

  const leave = async () => {
    setBusy(true)
    setError(null)
    const { data, error: refused } = await auth.api.user.POST('/v1/organizations/{org_id}/leave', {
      params: { path: { org_id: org.orgId } },
    })
    if (!data) {
      setBusy(false)
      setError(apiMessage(refused) ?? t('mobile:leave.failed'))
      return
    }
    const next = afterLeaving(data.remaining_memberships, choices, org.orgId)
    if (next.kind === 'signed-out') {
      announce('leftLast')
      await signOut()
      return
    }
    if (next.kind === 'switch') {
      await auth.orgs.switchTo(next.orgId).catch(() => undefined)
    }
    // With several left, the session has none active: the chooser shows.
    reload()
  }

  const confirmLeave = () =>
    Alert.alert(
      t('mobile:leave.confirmTitle', { name: here?.name ?? '' }),
      t('mobile:leave.confirmBody'),
      [
        { text: t('cancel'), style: 'cancel' },
        { text: t('mobile:leave.confirm'), style: 'destructive', onPress: () => void leave() },
      ],
    )

  return (
    <Screen title={t('mobile:orgs.here')} onBack={onBack} backLabel={t('mobile:back')}>
      {error ? <Banner tone="danger">{error}</Banner> : null}
      <Section>
        <Row
          title={here?.name ?? t('mobile:orgs.here')}
          subtitle={t('mobile:orgs.role', { role: t(`roles.${org.role}` as 'roles.user') })}
          leading={<Icon name="building" />}
          trailing={<Badge label={t('mobile:orgs.current')} tone="accent" />}
        />
      </Section>

      {canSwitch(choices) ? (
        <Section title={t('orgs.heading')}>
          {choices
            .filter((c) => c.orgId !== org.orgId)
            .map((choice) => (
              <Row
                key={choice.orgId}
                title={choice.name}
                subtitle={t('mobile:orgs.role', {
                  role: t(`roles.${choice.role}` as 'roles.user'),
                })}
                accessibilityHint={t('mobile:orgs.switchHint')}
                onPress={() => void switchTo(choice.orgId)}
                disabled={busy}
                trailing={<Icon name="forward" />}
              />
            ))}
        </Section>
      ) : null}

      <Section title={t('mobile:leave.title')}>
        <Body muted>{t('mobile:leave.intro')}</Body>
        {blocked === 'owner' ? <Banner tone="info">{t('mobile:leave.owner')}</Banner> : null}
        {choices.length <= 1 ? <Body muted>{t('mobile:leave.last')}</Body> : null}
        <View>
          <Button
            label={t('mobile:leave.button', { name: here?.name ?? '' })}
            variant="danger"
            disabled={blocked !== null}
            {...(blocked === 'owner' ? { accessibilityHint: t('mobile:leave.owner') } : {})}
            busy={busy}
            onPress={confirmLeave}
          />
        </View>
      </Section>
    </Screen>
  )
}
