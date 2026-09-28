import { Button, Card, Checkbox, Spinner, Toggle, toast } from '@unityevolv/unitykit'
import type { notification } from '@b2b-template/api'
import { useOrg } from '@b2b-template/ui-web'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

type Settings = notification.components['schemas']['OrgNotificationSettings']
type Channel = 'in_app' | 'push' | 'email'

const CATEGORIES = [
  'mention',
  'direct_message',
  'room_message',
  'room_activity',
  'meeting',
  'admin_providers',
  'admin_billing',
  'admin_templates',
  'admin_marketplace',
  'admin_directory',
] as const
const CHANNELS: Channel[] = ['in_app', 'push', 'email']

/**
 * The org's notification defaults (UO-179), small on purpose: what new
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
              {CATEGORIES.map((category) => (
                <tr key={category} className="border-t border-border">
                  <th scope="row" className="py-1 text-left font-normal">
                    {t(`settings.notifications.categories.${category}`)}
                  </th>
                  {CHANNELS.map((c) => (
                    <td key={c} className="py-1 text-center">
                      <Checkbox
                        aria-label={`${t(`settings.notifications.categories.${category}`)}: ${t(`settings.notifications.channels.${c}`)}`}
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
