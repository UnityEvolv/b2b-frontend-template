import { Button, Card, toast } from '@unityevolv/unitykit'
import type { organization } from '@b2b-template/api'
import { useOrg } from '@b2b-template/ui-web'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

type DataExport = organization.components['schemas']['DataExport']

/**
 * Your own data (UO-184): an export of everything about you across every
 * organization you belong to, emailed as a link. Only your own records;
 * never other people's messages to you beyond what you already see.
 */
export function YourData() {
  const { t, i18n } = useTranslation('account')
  const org = useOrg()
  const api = org?.api
  const [exports, setExports] = useState<DataExport[]>([])
  const [asking, setAsking] = useState(false)

  const load = useCallback(async () => {
    if (!api) return
    const { data } = await api.organization.GET('/v1/me/exports')
    if (data) setExports(data.exports)
  }, [api])

  useEffect(() => {
    const first = setTimeout(() => void load(), 0)
    return () => clearTimeout(first)
  }, [load])

  const ask = async () => {
    if (!api) return
    setAsking(true)
    const { response } = await api.organization.POST('/v1/me/exports', {
      params: { header: { 'Idempotency-Key': crypto.randomUUID() } },
    })
    setAsking(false)
    if (response.status === 429) toast.error(t('yourData.tooMany'))
    else if (!response.ok) toast.error(t('yourData.failed'))
    else {
      toast.success(t('yourData.asked'))
      void load()
    }
  }

  const latest = exports[0]
  const date = (s?: string) => (s ? new Date(s).toLocaleDateString(i18n.language) : '')
  return (
    <Card header={t('yourData.title')}>
      <p className="mb-3 text-sm">{t('yourData.intro')}</p>
      <Button icon="download" onClick={() => void ask()} loading={asking}>
        {t('yourData.ask')}
      </Button>
      {latest && (
        <p className="mt-3 text-sm">
          {latest.status === 'ready' && latest.download_url ? (
            <a className="link" href={latest.download_url}>
              {t('yourData.download', { date: date(latest.expires_at) })}
            </a>
          ) : (
            t(`yourData.states.${latest.status}`)
          )}
        </p>
      )}
    </Card>
  )
}
