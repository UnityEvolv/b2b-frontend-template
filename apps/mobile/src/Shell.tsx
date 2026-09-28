import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { NavigationRoot, useNavigation } from './nav'
import { TABS, type Route, type Tab } from './routes'
import { SecurityScreen } from './screens/mfa'
import { NotificationsScreen } from './screens/NotificationsScreen'
import { OrganizationScreen } from './screens/OrganizationScreen'
import { ProfileScreen } from './screens/ProfileScreen'
import { SessionsScreen } from './screens/SessionsScreen'
import { YouScreen } from './screens/YouScreen'
import { Icon, useColors, type IconName } from './ui'

/**
 * The signed-in app: a tab bar and the screen on top of the chosen tab's
 * stack. Switching organization or signing out unmounts all of it.
 */
export function Shell() {
  return (
    <NavigationRoot>
      <View style={{ flex: 1 }}>
        <View style={{ flex: 1 }}>
          <Current />
        </View>
        <TabBar />
      </View>
    </NavigationRoot>
  )
}

function Current() {
  const { route } = useNavigation()
  return <RouteScreen route={route} />
}

export function RouteScreen({ route }: { route: Route }) {
  switch (route.name) {
    case 'notifications':
      return <NotificationsScreen />
    case 'you':
      return <YouScreen />
    case 'security':
      return <WithBack screen={SecurityScreen} />
    case 'profile':
      return <WithBack screen={ProfileScreen} />
    case 'sessions':
      return <WithBack screen={SessionsScreen} />
    case 'organization':
      return <WithBack screen={OrganizationScreen} />
  }
}

/** A screen whose only way out is back. */
function WithBack({ screen: Screen }: { screen: (props: { onBack: () => void }) => ReactNode }) {
  const nav = useNavigation()
  return <Screen onBack={nav.back} />
}

const TAB_ICONS: Record<Tab, IconName> = { home: 'bell', you: 'profile' }

function TabBar() {
  const { t } = useTranslation('mobile')
  const nav = useNavigation()
  const colors = useColors()
  const insets = useSafeAreaInsets()
  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={t('tabs.label')}
      style={[
        styles.bar,
        {
          paddingBottom: Math.max(insets.bottom, 8),
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
      ]}
    >
      {TABS.map((tab) => {
        const selected = nav.tab === tab
        const tint = selected ? colors.accent : colors.muted
        return (
          <Pressable
            key={tab}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={t(`tabs.${tab}`)}
            onPress={() => nav.setTab(tab)}
            style={styles.tab}
          >
            <Icon name={TAB_ICONS[tab]} color={tint} size={22} />
            <Text style={[styles.tabLabel, { color: tint }]}>{t(`tabs.${tab}`)}</Text>
          </Pressable>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 8 },
  tab: { flex: 1, alignItems: 'center', gap: 2, minHeight: 48, justifyContent: 'center' },
  tabLabel: { fontSize: 12, fontWeight: '600' },
})
