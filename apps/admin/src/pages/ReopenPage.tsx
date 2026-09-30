import { Alert, Button, Card } from '@unityevolv/unitykit'
import { useApp } from '@b2b-template/ui-web'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router'

type State = 'ready' | 'working' | 'done' | 'invalid' | 'gone'

/**
 * Reopening a closing organization from the emailed link. No
 * sign-in: nobody can sign in to a closing org, and the link is the proof.
 */
export default function ReopenPage() {
  const { t } = useTranslation('admin')
  const { auth } = useApp()
  const [search] = useSearchParams()
  const orgId = search.get('org') ?? ''
  const token = search.get('token') ?? ''
  const [state, setState] = useState<State>(orgId && token ? 'ready' : 'invalid')

  const reopen = async () => {
    if (!auth) return
    setState('working')
    const { response } = await auth.api.organization.POST('/v1/organizations/{org_id}/reopen', {
      params: { path: { org_id: orgId } },
      body: { token },
    })
    setState(response.ok ? 'done' : response.status === 410 ? 'gone' : 'invalid')
  }

  return (
    <div className="mx-auto mt-16 max-w-md">
      <Card header={t('reopen.title')}>
        {state === 'ready' || state === 'working' ? (
          <>
            <p className="mb-4 text-sm">{t('reopen.body')}</p>
            <Button onClick={() => void reopen()} loading={state === 'working'}>
              {t('reopen.button')}
            </Button>
          </>
        ) : state === 'done' ? (
          <Alert variant="ok" title={t('reopen.done')}>
            <Link to="/sign-in" className="link">
              {t('reopen.signIn')}
            </Link>
          </Alert>
        ) : (
          <Alert variant="danger">{t(state === 'gone' ? 'reopen.gone' : 'reopen.invalid')}</Alert>
        )}
      </Card>
    </div>
  )
}
