import { Alert, Button, Card, Checkbox, Input, Spinner, Toggle, toast } from '@unityevolv/unitykit'
import type { notification } from '@b2b-template/api'
import { useOrg } from '@b2b-template/ui-web'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router'

import { disablePush, enablePush, pushState, type PushState } from '../notify/push'

type Preferences = notification.components['schemas']['NotificationPreferences']
type Channel = notification.components['schemas']['Channel']

const PEOPLE = ['mention', 'direct_message', 'room_message', 'room_activity', 'meeting'] as const
const ADMIN = [
  'admin_providers',
  'admin_billing',
  'admin_templates',
  'admin_marketplace',
  'admin_directory',
] as const
const CHANNELS: Channel[] = ['in_app', 'push', 'email']
const DAYS = [1, 2, 3, 4, 5, 6, 7] as const

const toTime = (minute: number) =>
  `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`
const fromTime = (value: string): number | null => {
  const [h, m] = value.split(':').map(Number)
  return h === undefined || m === undefined || Number.isNaN(h) || Number.isNaN(m)
    ? null
    : h * 60 + m
}

/**
 * Notification preferences: what reaches the person and when, on every
 * device, stored on their membership. An unsubscribe link from an
 * email lands here and turns its category's email off.
 */
export default function NotificationsPage() {
  const { t, i18n } = useTranslation('account')
  const org = useOrg()
  const [search, setSearch] = useSearchParams()
  const [prefs, setPrefs] = useState<Preferences | null>(null)
  const [saving, setSaving] = useState(false)
  const [push, setPush] = useState<PushState | null>(null)
  const [unsubscribed, setUnsubscribed] = useState<(typeof PEOPLE | typeof ADMIN)[number] | null>(
    null,
  )
  const api = org?.api
  const orgId = org?.orgId
  const admin = org?.role === 'owner' || org?.role === 'admin' || org?.role === 'billing_admin'

  useEffect(() => {
    if (!api || !orgId) return
    let current = true
    const token = search.get('unsubscribe')
    const load = async () => {
      if (token) {
        const { data } = await api.notification.POST('/v1/unsubscribe/{token}', {
          params: { path: { token } },
        })
        if (current && data)
          setUnsubscribed(data.category as (typeof PEOPLE | typeof ADMIN)[number])
        setSearch({}, { replace: true })
      }
      const { data } = await api.notification.GET(
        '/v1/organizations/{org_id}/notification-preferences',
        {
          params: { path: { org_id: orgId } },
        },
      )
      if (current && data) setPrefs(data)
      const state = await pushState()
      if (current) setPush(state)
    }
    void load()
    return () => {
      current = false
    }
    // The unsubscribe token is read once, on landing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, orgId])

  if (!api || !orgId) return null
  if (!prefs) return <Spinner block size="lg" label={t('prefs.loading')} />

  const channels = CHANNELS
  const choice = (category: string, channel: Channel) =>
    prefs.channels[category]?.[channel] ?? false
  const set = (category: string, channel: Channel, value: boolean) =>
    setPrefs({
      ...prefs,
      channels: {
        ...prefs.channels,
        [category]: {
          in_app: false,
          push: false,
          email: false,
          ...prefs.channels[category],
          [channel]: value,
        },
      },
    })

  const save = async () => {
    setSaving(true)
    const { data, error } = await api.notification.PUT(
      '/v1/organizations/{org_id}/notification-preferences',
      {
        params: { path: { org_id: orgId } },
        body: {
          channels: prefs.channels,
          push_previews: prefs.push_previews,
          digest_minute: prefs.digest_minute ?? null,
          quiet_hours: prefs.quiet_hours,
          muted: prefs.muted,
        },
      },
    )
    setSaving(false)
    if (data) {
      setPrefs(data)
      toast.success(t('prefs.saved'))
    } else {
      toast.error((error as { message?: string } | undefined)?.message ?? t('prefs.failed'))
    }
  }

  const test = async (channel: Channel) => {
    const { data } = await api.notification.POST(
      '/v1/organizations/{org_id}/notification-preferences/test',
      {
        params: { path: { org_id: orgId } },
        body: { channel },
      },
    )
    if (!data) toast.error(t('prefs.testFailed'))
    else if (data.delivered === 0) toast.info(t('prefs.testNoDevice'))
    else toast.success(t(`prefs.tested.${channel}`))
  }

  const togglePush = async () => {
    const next = push === 'on' ? await disablePush(api, orgId) : await enablePush(api, orgId)
    setPush(next)
    if (next === 'blocked') toast.error(t('prefs.push.blockedHelp'))
    if (next === 'unavailable') toast.error(t('prefs.push.unavailable'))
  }

  const weekday = new Intl.DateTimeFormat(i18n.language, { weekday: 'short' })
  // 2026-09-21 is a Monday: ISO day n is that date plus n - 1.
  const dayName = (d: number) => weekday.format(new Date(Date.UTC(2026, 8, 20 + d)))
  const rows = admin ? [...PEOPLE, ...ADMIN] : [...PEOPLE]

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold">{t('prefs.title')}</h1>
      {unsubscribed && (
        <Alert variant="ok">
          {t('prefs.unsubscribed', { category: t(`prefs.categories.${unsubscribed}`) })}
        </Alert>
      )}

      <Card header={t('prefs.what')}>
        <table className="w-full text-sm">
          <caption className="sr-only">{t('prefs.what')}</caption>
          <thead>
            <tr>
              <th scope="col" className="py-2 text-left">
                {t('prefs.category')}
              </th>
              {channels.map((c) => (
                <th key={c} scope="col" className="py-2 text-center">
                  {t(`prefs.channels.${c}`)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((category) => (
              <tr key={category} className="border-t border-border">
                <th scope="row" className="py-2 text-left font-normal">
                  {t(`prefs.categories.${category}`)}
                </th>
                {channels.map((c) => (
                  <td key={c} className="py-2 text-center">
                    <Checkbox
                      aria-label={t('prefs.cell', {
                        category: t(`prefs.categories.${category}`),
                        channel: t(`prefs.channels.${c}`),
                      })}
                      checked={choice(category, c)}
                      onChange={(event) => set(category, c, event.target.checked)}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card header={t('prefs.push.title')}>
        <p className="mb-2 text-sm">{t(`prefs.push.state.${push ?? 'off'}`)}</p>
        {push !== 'unsupported' && push !== 'blocked' && (
          <Button size="sm" onClick={() => void togglePush()}>
            {push === 'on' ? t('prefs.push.disable') : t('prefs.push.enable')}
          </Button>
        )}
        <div className="mt-4">
          <Toggle
            label={t('prefs.previews')}
            help={
              prefs.previews_allowed === false ? t('prefs.previewsOff') : t('prefs.previewsHelp')
            }
            checked={prefs.push_previews}
            disabled={prefs.previews_allowed === false}
            onChange={(event) => setPrefs({ ...prefs, push_previews: event.target.checked })}
          />
        </div>
      </Card>

      <Card header={t('prefs.digest.title')}>
        <Checkbox
          label={t('prefs.digest.working')}
          checked={prefs.digest_minute == null}
          onChange={(event) =>
            setPrefs({ ...prefs, digest_minute: event.target.checked ? null : 9 * 60 })
          }
        />
        {prefs.digest_minute != null && (
          <Input
            type="time"
            label={t('prefs.digest.at')}
            value={toTime(prefs.digest_minute)}
            onChange={(event) => {
              const m = fromTime(event.target.value)
              if (m !== null) setPrefs({ ...prefs, digest_minute: m })
            }}
          />
        )}
      </Card>

      <Card header={t('prefs.quiet.title')}>
        <p className="mb-3 text-sm text-muted-foreground">{t('prefs.quiet.explain')}</p>
        <Toggle
          label={t('prefs.quiet.on')}
          checked={prefs.quiet_hours.enabled}
          onChange={(event) =>
            setPrefs({
              ...prefs,
              quiet_hours: { ...prefs.quiet_hours, enabled: event.target.checked },
            })
          }
        />
        {prefs.quiet_hours.enabled && (
          <div className="mt-3 space-y-3">
            <div className="flex gap-3">
              <Input
                type="time"
                label={t('prefs.quiet.from')}
                value={toTime(prefs.quiet_hours.start_minute)}
                onChange={(event) => {
                  const m = fromTime(event.target.value)
                  if (m !== null)
                    setPrefs({ ...prefs, quiet_hours: { ...prefs.quiet_hours, start_minute: m } })
                }}
              />
              <Input
                type="time"
                label={t('prefs.quiet.to')}
                value={toTime(prefs.quiet_hours.end_minute)}
                onChange={(event) => {
                  const m = fromTime(event.target.value)
                  if (m !== null)
                    setPrefs({ ...prefs, quiet_hours: { ...prefs.quiet_hours, end_minute: m } })
                }}
              />
            </div>
            <fieldset className="flex flex-wrap gap-3">
              <legend className="mb-1 text-sm">{t('prefs.quiet.days')}</legend>
              {DAYS.map((d) => (
                <Checkbox
                  key={d}
                  label={dayName(d)}
                  checked={prefs.quiet_hours.days.includes(d)}
                  onChange={(event) =>
                    setPrefs({
                      ...prefs,
                      quiet_hours: {
                        ...prefs.quiet_hours,
                        days: event.target.checked
                          ? [...prefs.quiet_hours.days, d].sort()
                          : prefs.quiet_hours.days.filter((x) => x !== d),
                      },
                    })
                  }
                />
              ))}
            </fieldset>
          </div>
        )}
      </Card>

      <Card header={t('prefs.muted.title')}>
        {prefs.muted.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('prefs.muted.none')}</p>
        ) : (
          <ul className="space-y-1">
            {prefs.muted.map((id, i) => (
              <li key={id} className="flex items-center justify-between text-sm">
                {t('prefs.muted.one', { n: String(i + 1) })}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setPrefs({ ...prefs, muted: prefs.muted.filter((x) => x !== id) })}
                >
                  {t('prefs.muted.unmute')}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card header={t('prefs.test.title')}>
        <p className="mb-2 text-sm text-muted-foreground">{t('prefs.test.explain')}</p>
        <div className="flex flex-wrap gap-2">
          {channels.map((c) => (
            <Button key={c} size="sm" variant="secondary" onClick={() => void test(c)}>
              {t(`prefs.test.${c}`)}
            </Button>
          ))}
        </div>
      </Card>

      <div className="flex justify-end">
        <Button onClick={() => void save()} disabled={saving}>
          {t('prefs.save')}
        </Button>
      </div>
    </div>
  )
}
