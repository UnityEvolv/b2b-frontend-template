import {
  Alert,
  Badge,
  Button,
  Card,
  Select,
  Spinner,
  Table,
  type TableColumn,
} from '@unityevolv/unitykit'
import type { user } from '@b2b-template/api'
import { useOrg } from '@b2b-template/ui-web'
import { useRef, useState, type DragEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import {
  errorReport,
  guessMapping,
  IMPORT_FIELDS,
  isSheet,
  mappingJson,
  REQUIRED_FIELDS,
  type Mapping,
} from './import'

type Columns = user.components['schemas']['ImportColumns']
type Result = user.components['schemas']['ImportResult']
type Row = user.components['schemas']['ImportRow']
type Step = 'pick' | 'map' | 'preview' | 'importing' | 'done'

const message = (error: unknown) => (error as { message?: string } | undefined)?.message

/**
 * Bulk import: drop a CSV or XLSX, match its columns to the fields
 * whatever the sheet calls them, see every row checked before anything is
 * sent, then import. Failed rows can be downloaded, fixed and uploaded
 * again. The server checks everything, including the plan's user cap.
 */
export default function ImportUsersPage() {
  const { t } = useTranslation('admin')
  const org = useOrg()
  const input = useRef<HTMLInputElement>(null)
  const [step, setStep] = useState<Step>('pick')
  const [file, setFile] = useState<File | null>(null)
  const [columns, setColumns] = useState<Columns | null>(null)
  const [mapping, setMapping] = useState<Mapping>({ email: '', name: '', role: '' })
  const [result, setResult] = useState<Result | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const [busy, setBusy] = useState(false)

  if (!org) return <Spinner block size="lg" label={t('import.loading')} />

  /** The import, checked only on a dry run, sent otherwise. */
  const runImport = async (dryRun: boolean): Promise<Result | null> => {
    if (!file) return null
    const form = new FormData()
    form.append('file', file, file.name)
    form.append('mapping', mappingJson(mapping))
    const { data, error: failed } = await org.api.user.POST('/v1/organizations/{org_id}/imports', {
      params: { path: { org_id: org.orgId }, query: { dry_run: dryRun } },
      body: form as never,
      bodySerializer: (body: unknown) => body as FormData,
    })
    if (!data) {
      setError(message(failed) ?? t('import.failed'))
      return null
    }
    setError(null)
    return data
  }

  const choose = async (picked: File | undefined) => {
    if (!picked) return
    if (!isSheet(picked)) {
      setError(t('import.wrongType'))
      return
    }
    setFile(picked)
    setBusy(true)
    const form = new FormData()
    form.append('file', picked, picked.name)
    const { data, error: failed } = await org.api.user.POST(
      '/v1/organizations/{org_id}/imports/columns',
      {
        params: { path: { org_id: org.orgId } },
        body: form as never,
        bodySerializer: (body: unknown) => body as FormData,
      },
    )
    setBusy(false)
    if (!data) {
      setError(message(failed) ?? t('import.unreadable'))
      return
    }
    setError(null)
    setColumns(data)
    setMapping(guessMapping(data.columns))
    setStep('map')
  }

  const preview = async () => {
    setBusy(true)
    const data = await runImport(true)
    setBusy(false)
    if (data) {
      setResult(data)
      setStep('preview')
    }
  }

  const commit = async () => {
    setStep('importing')
    const data = await runImport(false)
    if (data) {
      setResult(data)
      setStep('done')
    } else {
      setStep('preview')
    }
  }

  const download = () => {
    if (!result) return
    const csv = errorReport(result.rows, [
      t('import.report.row'),
      t('import.report.email'),
      t('import.report.name'),
      t('import.report.role'),
      t('import.report.problems'),
    ])
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = t('import.report.fileName')
    link.click()
    URL.revokeObjectURL(url)
  }

  const onDrop = (event: DragEvent) => {
    event.preventDefault()
    setDragging(false)
    void choose(event.dataTransfer.files[0])
  }

  const rowColumns: TableColumn<Row>[] = [
    { key: 'row', header: t('import.report.row'), cell: (r) => String(r.row) },
    { key: 'email', header: t('import.report.email'), card: 'title', cell: (r) => r.email ?? '' },
    { key: 'name', header: t('import.report.name'), cell: (r) => r.name ?? '' },
    {
      key: 'role',
      header: t('import.report.role'),
      cell: (r) => (r.role ? t(`roles.${r.role}` as never, { ns: 'common' }) : ''),
    },
    {
      key: 'status',
      header: t('import.status'),
      cell: (r) => (
        <Badge variant={r.status === 'failed' ? 'danger' : 'secondary'}>
          {t(`import.statuses.${r.status}`)}
        </Badge>
      ),
    },
    {
      key: 'errors',
      header: t('import.report.problems'),
      cell: (r) => r.errors.map((e) => e.message).join(' '),
    },
  ]
  const failed = result?.summary.invalid ?? 0
  const missing = REQUIRED_FIELDS.filter((f) => !mapping[f])

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">{t('import.title')}</h1>
        <Link to="/users" className="btn btn-ghost">
          {t('import.back')}
        </Link>
      </div>
      {error && (
        <Alert variant="danger" className="mb-4">
          {error}
        </Alert>
      )}

      {step === 'pick' && (
        <Card className="max-w-2xl">
          <div
            role="button"
            tabIndex={0}
            aria-label={t('import.drop')}
            className={`rounded-box border-2 border-dashed p-10 text-center ${dragging ? 'border-primary bg-base-200' : 'border-base-300'}`}
            onClick={() => input.current?.click()}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && input.current?.click()}
            onDragOver={(e) => {
              e.preventDefault()
              setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
          >
            {busy ? <Spinner label={t('import.reading')} /> : <p>{t('import.drop')}</p>}
            <p className="mt-2 text-sm">{t('import.limits')}</p>
          </div>
          <input
            ref={input}
            type="file"
            className="hidden"
            accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={(e) => {
              void choose(e.target.files?.[0])
              e.target.value = ''
            }}
          />
        </Card>
      )}

      {step === 'map' && columns && (
        <Card header={t('import.mapTitle', { file: file?.name ?? '' })} className="max-w-3xl">
          <p className="mb-4 text-sm">{t('import.mapIntro', { rows: String(columns.rows) })}</p>
          <div className="grid gap-4 sm:grid-cols-3">
            {IMPORT_FIELDS.map((field) => (
              <Select
                key={field}
                label={t(`import.fields.${field}`)}
                help={REQUIRED_FIELDS.includes(field) ? t('import.required') : t('import.roleHelp')}
                value={mapping[field]}
                placeholder={t('import.noColumn')}
                onChange={(e) => setMapping((m) => ({ ...m, [field]: e.target.value }))}
              >
                {columns.columns.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            ))}
          </div>
          {columns.sample.length > 0 && (
            <div className="mt-6 overflow-x-auto">
              <table className="table table-sm">
                <caption className="text-left text-sm">{t('import.sample')}</caption>
                <thead>
                  <tr>
                    {columns.columns.map((c) => (
                      <th key={c} scope="col">
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {columns.sample.map((row, i) => (
                    <tr key={i}>
                      {columns.columns.map((c, j) => (
                        <td key={c}>{row[j] ?? ''}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="mt-6 flex gap-2">
            <Button disabled={busy || missing.length > 0} onClick={() => void preview()}>
              {t('import.check')}
            </Button>
            <Button variant="ghost" onClick={() => setStep('pick')}>
              {t('import.another')}
            </Button>
          </div>
        </Card>
      )}

      {(step === 'preview' || step === 'importing' || step === 'done') && result && (
        <>
          <Alert variant={failed > 0 ? 'warn' : 'info'} className="mb-4">
            {step === 'done'
              ? t('import.summaryDone', {
                  invited: String(result.summary.invited),
                  invalid: String(failed),
                })
              : t('import.summary', {
                  valid: String(result.summary.valid),
                  invalid: String(failed),
                })}
          </Alert>
          <div className="mb-4 flex flex-wrap gap-2">
            {step === 'preview' && (
              <>
                <Button disabled={result.summary.valid === 0} onClick={() => void commit()}>
                  {t('import.confirm', { people: String(result.summary.valid) })}
                </Button>
                <Button variant="ghost" onClick={() => setStep('map')}>
                  {t('import.remap')}
                </Button>
              </>
            )}
            {step === 'importing' && (
              <Spinner label={t('import.importing', { people: String(result.summary.valid) })} />
            )}
            {failed > 0 && step !== 'importing' && (
              <Button variant="secondary" onClick={download}>
                {t('import.download')}
              </Button>
            )}
            {step === 'done' && (
              <Link to="/users" className="btn btn-primary">
                {t('import.back')}
              </Link>
            )}
          </div>
          <Table
            caption={t('import.rowsCaption')}
            columns={rowColumns}
            rows={result.rows}
            rowKey={(r) => String(r.row)}
          />
        </>
      )}
    </>
  )
}
