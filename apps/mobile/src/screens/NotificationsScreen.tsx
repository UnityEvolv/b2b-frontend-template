import type { notification } from '@b2b-template/api'
import { feedWords, useNotificationCategories } from '@b2b-template/client'
import { formatDateTime } from '@b2b-template/core'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { NS } from '../i18n'
import { useLocale } from '../locale'
import { useOrg } from '../org'
import { Banner, Body, Button, Icon, Loading, Row, Screen, Title } from '../ui'

type Entry = notification.components['schemas']['FeedEntry']

/** The feed is read again this often while the screen is open. */
const POLL_MS = 60_000

/**
 * The notification feed: what happened while the person was away, newest
 * first, from the same notification API as the web app's bell, each in the
 * heading and line the notification service renders for it (an entry with no
 * heading is named by its category's label in the registry). Reading an entry
 * here reads it on every device.
 */
export function NotificationsScreen() {
  const { t } = useTranslation(NS)
  const locale = useLocale()
  const org = useOrg()
  const [entries, setEntries] = useState<Entry[] | null>(null)
  const [unread, setUnread] = useState(0)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)

  const api = org?.api
  const orgId = org?.orgId
  const categories = useNotificationCategories(api)

  const load = useCallback(async () => {
    if (!api || !orgId) return
    const { data } = await api.notification.GET('/v1/organizations/{org_id}/notifications', {
      params: { path: { org_id: orgId }, query: { limit: 30 } },
    })
    setFailed(!data)
    if (!data) return
    setEntries(data.entries)
    setUnread(data.unread)
  }, [api, orgId])

  useEffect(() => {
    const first = setTimeout(() => void load(), 0)
    const timer = setInterval(() => void load(), POLL_MS)
    return () => {
      clearTimeout(first)
      clearInterval(timer)
    }
  }, [load, attempt])

  const read = async (body: { ids?: string[]; all?: boolean }) => {
    if (!api || !orgId) return
    const { data } = await api.notification.POST('/v1/organizations/{org_id}/notifications/read', {
      params: { path: { org_id: orgId } },
      body,
    })
    if (data) setUnread(data.unread)
    setEntries((all) =>
      (all ?? []).map((e) => (body.all || body.ids?.includes(e.id) ? { ...e, read: true } : e)),
    )
  }

  const summary = (e: Entry): string => {
    const words = feedWords(e, categories)
    if (words.heading && words.counted) return words.heading
    return t('account:notify.batched', {
      heading: words.heading ?? t('account:notify.kinds.other'),
      count: e.count,
    })
  }

  if (!org) return null
  if (failed && !entries) {
    return (
      <Screen>
        <Title>{t('account:notify.title')}</Title>
        <Banner tone="danger">{t('mobile:notifications.failed')}</Banner>
        <Button label={t('retry')} variant="secondary" onPress={() => setAttempt((n) => n + 1)} />
      </Screen>
    )
  }
  if (!entries) return <Loading label={t('account:notify.loading')} />

  return (
    <Screen>
      <Title>{t('account:notify.title')}</Title>
      {entries.length === 0 ? <Body muted>{t('account:notify.empty')}</Body> : null}
      {entries.map((e) => (
        <Row
          key={e.id}
          title={summary(e)}
          subtitle={[e.line.trim(), formatDateTime(e.occurred_at, locale)]
            .filter(Boolean)
            .join(' · ')}
          leading={<Icon name={e.read ? 'bell' : 'info'} />}
          {...(e.read ? {} : { onPress: () => void read({ ids: [e.id] }) })}
          {...(e.read ? {} : { accessibilityHint: t('account:notify.unread') })}
        />
      ))}
      {unread > 0 ? (
        <Button
          label={t('account:notify.readAll')}
          variant="secondary"
          onPress={() => void read({ all: true })}
        />
      ) : null}
    </Screen>
  )
}
