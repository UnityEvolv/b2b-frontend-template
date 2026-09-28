import {
  Alert,
  Button,
  Card,
  Input,
  Modal,
  Table,
  toast,
  type TableColumn,
} from '@unityevolv/unitykit'
import type { organization } from '@b2b-template/api'
import { useOrg } from '@b2b-template/ui-web'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

type Retention = organization.components['schemas']['Retention']
type DataExport = organization.components['schemas']['DataExport']

const CONFIRM_FIELD = 'confirm-name'

/**
 * What the platform keeps and for how long, the organization's exports,
 * and closing it (UO-183, UO-184). The schedule is the same words for every
 * org; the API refuses whatever a button here does not offer.
 */
export function OrgDataSettings({ name }: { name: string }) {
  const { t, i18n } = useTranslation('admin')
  const org = useOrg()
  const api = org?.api
  const orgId = org?.orgId
  const owner = org?.role === 'owner'
  const [retention, setRetention] = useState<Retention | null>(null)
  const [exports, setExports] = useState<DataExport[]>([])
  const [asking, setAsking] = useState(false)
  const [closing, setClosing] = useState(false)
  const [typed, setTyped] = useState('')
  const [closed, setClosed] = useState<string | null>(null)

  const loadExports = useCallback(async () => {
    if (!api || !orgId || !owner) return
    const { data } = await api.organization.GET('/v1/organizations/{org_id}/exports', {
      params: { path: { org_id: orgId } },
    })
    if (data) setExports(data.exports)
  }, [api, orgId, owner])

  useEffect(() => {
    if (!api || !orgId) return
    let current = true
    void api.organization
      .GET('/v1/organizations/{org_id}/retention', { params: { path: { org_id: orgId } } })
      .then(({ data }) => current && data && setRetention(data))
    const first = setTimeout(() => void loadExports(), 0)
    return () => {
      current = false
      clearTimeout(first)
    }
  }, [api, orgId, loadExports])

  const askExport = async () => {
    if (!api || !orgId) return
    setAsking(true)
    const { response } = await api.organization.POST('/v1/organizations/{org_id}/exports', {
      params: { path: { org_id: orgId }, header: { 'Idempotency-Key': crypto.randomUUID() } },
    })
    setAsking(false)
    if (response.status === 429) toast.error(t('data.exports.tooMany'))
    else if (!response.ok) toast.error(t('data.failed'))
    else {
      toast.success(t('data.exports.asked'))
      void loadExports()
    }
  }

  const close = async () => {
    if (!api || !orgId) return
    const { data, response } = await api.organization.POST('/v1/organizations/{org_id}/close', {
      params: { path: { org_id: orgId } },
      body: { confirm_name: typed },
    })
    if (!response.ok || !data) {
      toast.error(t('data.close.failed'))
      return
    }
    setClosing(false)
    setClosed(data.purge_after ?? null)
  }

  const date = (s?: string) => (s ? new Date(s).toLocaleDateString(i18n.language) : '')
  const columns: TableColumn<DataExport>[] = [
    {
      key: 'requested',
      header: t('data.exports.requested'),
      cell: (e) => date(e.requested_at),
      card: 'title',
    },
    {
      key: 'status',
      header: t('data.exports.status'),
      cell: (e) => t(`data.exports.states.${e.status}`),
    },
    {
      key: 'download',
      header: t('data.exports.download'),
      cell: (e) =>
        e.download_url ? (
          <a className="link" href={e.download_url}>
            {t('data.exports.downloadLink', { date: date(e.expires_at) })}
          </a>
        ) : null,
    },
  ]

  return (
    <>
      <Card header={t('data.retention.title')}>
        <p className="mb-3 text-sm">{t('data.retention.intro')}</p>
        {retention && (
          <dl className="space-y-2 text-sm">
            {retention.classes.map((c) => (
              <div key={c.class}>
                <dt className="font-medium">{t(`data.retention.classes.${c.class}`)}</dt>
                <dd className="text-muted-foreground">{c.kept}</dd>
              </div>
            ))}
          </dl>
        )}
      </Card>

      {owner && (
        <Card header={t('data.exports.title')}>
          <p className="mb-3 text-sm">{t('data.exports.intro')}</p>
          <Button onClick={() => void askExport()} loading={asking} icon="download">
            {t('data.exports.ask')}
          </Button>
          {exports.length > 0 && (
            <Table
              className="mt-4"
              columns={columns}
              rows={exports}
              rowKey={(e) => e.id}
              size="sm"
            />
          )}
        </Card>
      )}

      {owner && (
        <Card header={t('data.close.title')} className="border-danger">
          {closed !== null ? (
            <Alert variant="warn">{t('data.close.done', { date: date(closed) })}</Alert>
          ) : (
            <>
              <p className="mb-3 text-sm">{t('data.close.intro')}</p>
              <Button variant="danger" onClick={() => setClosing(true)}>
                {t('data.close.button')}
              </Button>
            </>
          )}
        </Card>
      )}

      <Modal
        open={closing}
        onOpenChange={(open) => {
          setClosing(open)
          if (!open) setTyped('')
        }}
        title={t('data.close.confirmTitle', { name })}
        footer={
          <Button variant="danger" disabled={typed !== name} onClick={() => void close()}>
            {t('data.close.confirm')}
          </Button>
        }
      >
        <p className="mb-3 text-sm">{t('data.close.warning')}</p>
        <Input
          id={CONFIRM_FIELD}
          label={t('data.close.typeName', { name })}
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          autoComplete="off"
        />
      </Modal>
    </>
  )
}
