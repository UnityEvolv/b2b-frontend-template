import { Alert, Button, Card } from '@unityevolv/unitykit'
import { useApp } from '@b2b-template/ui-web'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation, useSearchParams } from 'react-router'

type State = 'ready' | 'working' | 'done' | 'failed'

const UNDO_PATH = '/undo-email-change'

/**
 * The two links an email change sends: confirming the new address,
 * from the new inbox; and undoing it within the hour, from the old one.
 * Neither needs a session; the link is the proof. Nothing happens until the
 * person presses the button, so a mail scanner opening the link does not
 * change anyone's address.
 */
export default function EmailChangePage() {
  const { t } = useTranslation('account')
  const { auth, signInPath } = useApp()
  const { pathname } = useLocation()
  const [search] = useSearchParams()
  const token = search.get('token') ?? ''
  const undo = pathname === UNDO_PATH
  const [state, setState] = useState<State>(token ? 'ready' : 'failed')
  const [email, setEmail] = useState('')

  const go = async () => {
    if (!auth) return
    setState('working')
    const { data, response } = undo
      ? await auth.api.identity.POST('/v1/email-change/undo', { body: { token } })
      : await auth.api.identity.POST('/v1/email-change/confirm', { body: { token } })
    if (response.ok && data) {
      setEmail(data.email)
      setState('done')
    } else setState('failed')
  }

  const kind = undo ? 'undo' : 'confirm'
  return (
    <div className="mx-auto mt-16 max-w-md">
      <Card header={t(`emailChange.${kind}.title`)}>
        {state === 'ready' || state === 'working' ? (
          <>
            <p className="mb-4 text-sm">{t(`emailChange.${kind}.body`)}</p>
            <Button onClick={() => void go()} loading={state === 'working'}>
              {t(`emailChange.${kind}.button`)}
            </Button>
          </>
        ) : state === 'done' ? (
          <Alert variant="ok" title={t(`emailChange.${kind}.done`, { email })}>
            <Link to={signInPath} className="link">
              {t('emailChange.signIn')}
            </Link>
          </Alert>
        ) : (
          <Alert variant="danger">{t(`emailChange.${kind}.failed`)}</Alert>
        )}
      </Card>
    </div>
  )
}
