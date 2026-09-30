import { Button, Card, Checkbox, Spinner, Toggle, toast } from '@unityevolv/unitykit'
import type { notification } from '@b2b-template/api'
import { humanizeKey } from '@b2b-template/core'
import { useOrg } from '@b2b-template/ui-web'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

type Settings = notification.components['schemas']['OrgNotificationSettings']
type Channel = 'in_app' | 'push' | 'email'

/** The categories the strings name; anything else the server sends gets a readable fallback. */
const CATEGORIES = ['mention', 'direct_message', 'admin_billing', 'admin_directory'] as const
type Known = (typeof CATEGORIES)[number]
const known = (category: string): category is Known =>
  (CATEGORIES as readonly string[]).includes(category)
const CHANNELS: Channel[] = ['in_app', 'push', 'email']

/**
 * The org's notification defaults, small on purpose: what new
 * members start with, and whether pushes may show message text at all. An
 * Owner's call; people own their own noise from there.
 */
export function NotificationDefaults() {
  const { t } = useTranslation('admin')
  const org = useOrg()
  const [settings, setSettings] = useState<Settings | null>(null)
  const api = org?.api
  const orgId = org?.orgId
  const owner = org?.role === 'owner'

  useEffect(() => {
    if (!api || !orgId || !owner) return
    let current = true
    void api.notification
      .GET('/v1/organizations/{org_id}/notification-settings', {
        params: { path: { org_id: orgId } },
      })
      .then(({ data }) => current && data && setSettings(data))
    return () => {
      current = false
    }
  }, [api, orgId, owner])

  if (!api || !orgId || !owner) return null

  const save = async () => {
    if (!settings) return
    const { data } = await api.notification.PUT(
      '/v1/organizations/{org_id}/notification-settings',
      {
        params: { path: { org_id: orgId } },
        body: settings,
      },
    )
    if (data) {
      setSettings(data)
      toast.success(t('settings.notifications.saved'))
    } else {
      toast.error(t('settings.notifications.failed'))
    }
  }

  const label = (category: string) =>
    known(category) ? t(`settings.notifications.categories.${category}`) : humanizeKey(category)
  // The known categories first, then any the server has that the strings do not.
  const rows = [...CATEGORIES, ...Object.keys(settings?.channels ?? {}).filter((c) => !known(c))]

  return (
    <Card header={t('settings.notifications.title')}>
      {!settings ? (
        <Spinner block size="sm" label={t('settings.notifications.title')} />
      ) : (
        <>
          <p className="mb-3 text-sm text-muted-foreground">
            {t('settings.notifications.explain')}
          </p>
          <table className="mb-4 w-full text-sm">
            <caption className="sr-only">{t('settings.notifications.title')}</caption>
            <thead>
              <tr>
                <th scope="col" className="py-1 text-left">
                  {t('settings.notifications.category')}
                </th>
                {CHANNELS.map((c) => (
                  <th key={c} scope="col" className="py-1 text-center">
                    {t(`settings.notifications.channels.${c}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((category) => (
                <tr key={category} className="border-t border-border">
                  <th scope="row" className="py-1 text-left font-normal">
                    {label(category)}
                  </th>
                  {CHANNELS.map((c) => (
                    <td key={c} className="py-1 text-center">
                      <Checkbox
                        aria-label={`${label(category)}: ${t(`settings.notifications.channels.${c}`)}`}
                        checked={settings.channels[category]?.[c] ?? false}
                        onChange={(event) =>
                          setSettings({
                            ...settings,
                            channels: {
                              ...settings.channels,
                              [category]: {
                                in_app: false,
                                push: false,
                                email: false,
                                digest: false,
                                ...settings.channels[category],
                                [c]: event.target.checked,
                              },
                            },
                          })
                        }
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <Toggle
            label={t('settings.notifications.previews')}
            help={t('settings.notifications.previewsHelp')}
            checked={settings.previews_allowed}
            onChange={(event) =>
              setSettings({ ...settings, previews_allowed: event.target.checked })
            }
          />
          <Button className="mt-3" onClick={() => void save()}>
            {t('settings.save')}
          </Button>
        </>
      )}
    </Card>
  )
}
