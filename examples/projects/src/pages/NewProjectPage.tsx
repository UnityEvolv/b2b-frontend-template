import { Alert, Button, Card, EmptyState, Input, Textarea, toast } from '@unityevolv/unitykit'
import { isApiError } from '@b2b-template/api'
import { useOrg } from '@b2b-template/ui-web'
import { useRef, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router'

import { refusal, type Refusal } from '../api'
import { RefusalAlert, useProjects } from '../context'

interface Draft {
  name: string
  description: string
}

/** A key for one intended create, and what it was made for. */
interface Attempt {
  key: string
  draft: Draft
}

const same = (a: Draft, b: Draft) => a.name === b.name && a.description === b.description

/**
 * The key for this submit: the pending one when the same project is being
 * submitted again after a failure, so the service answers with the project
 * the first request made rather than making a second; a fresh one for
 * anything else.
 */
export function keyFor(pending: Attempt | null, draft: Draft, fresh: () => string): Attempt {
  return pending && same(pending.draft, draft) ? pending : { key: fresh(), draft }
}

/**
 * Create a project. The route needs the `projects` permission, and the
 * service refuses without it anyway. Over the plan's cap the refusal names
 * the plan that allows more, with a way to billing.
 */
export default function NewProjectPage() {
  const { t } = useTranslation('projects')
  const org = useOrg()
  const { api } = useProjects()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [busy, setBusy] = useState(false)
  const [refused, setRefused] = useState<Refusal | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [fields, setFields] = useState<Record<string, string>>({})
  const pending = useRef<Attempt | null>(null)

  if (!api || !org) return <EmptyState icon="file" titleAs="h2" title={t('errors.notConnected')} />

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const draft = { name: name.trim(), description: description.trim() }
    const attempt = keyFor(pending.current, draft, () => crypto.randomUUID())
    pending.current = attempt
    setBusy(true)
    setRefused(null)
    setNotice(null)
    setFields({})
    try {
      const { data, error, response } = await api.POST('/v1/organizations/{org_id}/projects', {
        params: { path: { org_id: org.orgId }, header: { 'Idempotency-Key': attempt.key } },
        body: {
          name: draft.name,
          ...(draft.description ? { description: draft.description } : {}),
        },
      })
      if (data) {
        pending.current = null
        toast.success(t('create.created'))
        void navigate(`/projects/${data.id}`)
        return
      }
      const code = isApiError(error) ? error.code : ''
      if (code === 'request.idempotency_key_reused') {
        // The key belongs to another project; the next submit is a new create.
        pending.current = null
        setNotice(t('create.reused'))
      } else if (response.status >= 500) {
        // Kept: a retry of this submit carries the same key.
        setNotice(t('create.unreachable'))
      } else {
        // A refusal is final for this key; the same submit again is a new create.
        pending.current = null
        if (isApiError(error) && error.fields && response.status === 400) setFields(error.fields)
        setRefused(refusal(response.status, error))
      }
    } catch {
      // No answer at all: the first request may have landed. Kept for the retry.
      setNotice(t('create.unreachable'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Link to="/projects" className="link mb-4 inline-block text-sm">
        {t('create.back')}
      </Link>
      <h1 className="mb-6 text-2xl font-semibold">{t('create.title')}</h1>
      <RefusalAlert refusal={refused} />
      {notice && (
        <Alert variant="warn" className="mb-4">
          {notice}
        </Alert>
      )}
      <Card>
        <form className="space-y-4" onSubmit={(e) => void submit(e)}>
          <Input
            label={t('create.name')}
            help={t('create.nameHelp')}
            error={fields.name}
            required
            maxLength={200}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Textarea
            label={t('create.description')}
            help={t('create.descriptionHelp')}
            error={fields.description}
            maxLength={2000}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <Button type="submit" disabled={busy || name.trim() === ''}>
            {busy ? t('create.submitting') : t('create.submit')}
          </Button>
        </form>
      </Card>
    </>
  )
}
