import { Button, Card, Checkbox, Spinner, Toggle, toast } from '@unityevolv/unitykit'
import type { notification } from '@b2b-template/api'
import { channelsIn, useNotificationCategories, useOrg, withChoice } from '@b2b-template/ui-web'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

type Settings = notification.components['schemas']['OrgNotificationSettings']

/**
 * The org's notification defaults, small on purpose: what new
 * members start with, and whether pushes may show message text at all. An
 * Owner's call; people own their own noise from there. The rows are the
 * categories the deployment registers, members' and admins' alike, with the
 * notification service's labels; a category offers only the channels it may
 * use.
 */
export function NotificationDefaults() {
  const { t } = useTranslation('admin')
  const org = useOrg()
  const [settings, setSettings] = useState<Settings | null>(null)
  const api = org?.api
  const orgId = org?.orgId
  const owner = org?.role === 'owner'
  const categories = useNotificationCategories(owner ? api : undefined)

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

  const channels = channelsIn(categories ?? [])

  return (
    <Card header={t('settings.notifications.title')}>
      {!settings || !categories ? (
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
                {channels.map((c) => (
                  <th key={c} scope="col" className="py-1 text-center">
                    {t(`settings.notifications.channels.${c}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {categories.map((category) => (
                <tr key={category.id} className="border-t border-border">
                  <th scope="row" className="py-1 text-left font-normal">
                    <span className="block">{category.label}</span>
                    {category.description && (
                      <span className="block text-xs text-muted-foreground">
                        {category.description}
                      </span>
                    )}
                  </th>
                  {channels.map((c) => (
                    <td key={c} className="py-1 text-center">
                      {category.channels.includes(c) && (
                        <Checkbox
                          aria-label={`${category.label}: ${t(`settings.notifications.channels.${c}`)}`}
                          checked={(settings.channels[category.id] ?? category.default_channels)[c]}
                          onChange={(event) =>
                            setSettings({
                              ...settings,
                              channels: withChoice(
                                settings.channels,
                                category,
                                c,
                                event.target.checked,
                              ),
                            })
                          }
                        />
                      )}
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
