import { displayName } from '@b2b-template/core'
import { useSession } from '@b2b-template/client'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { View } from 'react-native'

import { NS } from '../i18n'
import { useNavigation } from '../nav'
import { Avatar, Body, Button, Icon, Row, Screen, Section, Title } from '../ui'

/**
 * The person's own tab: who is signed in, and signing out. The
 * profile, security and organization sections sit here.
 */
export function YouScreen() {
  const { t } = useTranslation(NS)
  const { state, signOut } = useSession()
  const nav = useNavigation()
  const [busy, setBusy] = useState(false)
  if (state.status !== 'signed-in') return null
  const { user } = state.session
  const name = displayName(user)

  return (
    <Screen>
      <Title>{t('mobile:you.title')}</Title>
      <Section>
        <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
          <Avatar name={name} uri={user.photoUrl ?? null} size={56} />
          <View style={{ flex: 1 }}>
            <Body>{name}</Body>
            <Body muted>{user.email}</Body>
          </View>
        </View>
      </Section>
      <Row
        title={t('account:profile.title')}
        subtitle={t('mobile:you.profileHelp')}
        onPress={() => nav.push({ name: 'profile' })}
        leading={<Icon name="profile" />}
        trailing={<Icon name="forward" />}
      />
      <Row
        title={t('mfa.settingsTitle')}
        subtitle={t('mobile:you.securityHelp')}
        onPress={() => nav.push({ name: 'security' })}
        leading={<Icon name="shield" />}
        trailing={<Icon name="forward" />}
      />
      <Row
        title={t('mobile:orgs.here')}
        subtitle={t('mobile:you.orgHelp')}
        onPress={() => nav.push({ name: 'organization' })}
        leading={<Icon name="building" />}
        trailing={<Icon name="forward" />}
      />
      <Row
        title={t('account:profile.sessions')}
        subtitle={t('mobile:you.sessionsHelp')}
        onPress={() => nav.push({ name: 'sessions' })}
        leading={<Icon name="key" />}
        trailing={<Icon name="forward" />}
      />
      <Button
        label={t('mobile:you.signOut')}
        accessibilityHint={t('mobile:you.signOutHint')}
        variant="danger"
        icon="signOut"
        busy={busy}
        onPress={() => {
          setBusy(true)
          void signOut().finally(() => setBusy(false))
        }}
      />
    </Screen>
  )
}
