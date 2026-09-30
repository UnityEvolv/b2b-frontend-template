import { Alert, Button, Card, Input, Modal, toast } from '@unityevolv/unitykit'
import { isApiError } from '@b2b-template/api'
import { useApp } from '@b2b-template/ui-web'
import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'

const CONFIRM_WORD = 'DELETE'

/** What the identity service says when a new address cannot be used. */
const EMAIL_REFUSALS: Record<string, string> = {
  'email.managed_by_provider': 'managedByProvider',
  'email.local_account_required': 'localRequired',
  'email.taken': 'taken',
  'email.throttled': 'throttled',
}

/**
 * Changing the sign-in address, and deleting the account (UO-184). Both are
 * checked again by the API: an address an identity provider manages cannot
 * be changed here, and the last Owner of an organization cannot delete
 * their account until someone else owns it.
 */
export function AccountCards({
  email,
  deletionAfter,
  onChanged,
}: {
  email: string
  deletionAfter?: string | undefined
  onChanged: () => void
}) {
  const { t, i18n } = useTranslation('account')
  const { auth } = useApp()
  const api = auth?.api
  const [next, setNext] = useState('')
  const [emailError, setEmailError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [typed, setTyped] = useState('')
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const changeEmail = async (e: FormEvent) => {
    e.preventDefault()
    if (!api) return
    setBusy(true)
    setEmailError(null)
    const { response, error } = await api.identity.POST('/v1/me/email', {
      body: { email: next.trim() },
    })
    setBusy(false)
    if (response.ok) {
      setSent(true)
      return
    }
    const code = isApiError(error) ? error.code : ''
    setEmailError(
      t(
        `account.email.errors.${EMAIL_REFUSALS[code] ?? 'invalid'}` as 'account.email.errors.invalid',
      ),
    )
  }

  const scheduleDeletion = async () => {
    if (!api) return
    setBusy(true)
    const { response, error } = await api.user.POST('/v1/me/deletion', { body: { confirm: typed } })
    setBusy(false)
    if (response.ok) {
      setDeleting(false)
      setTyped('')
      onChanged()
      return
    }
    setDeleteError(
      isApiError(error) && error.code === 'account.last_owner'
        ? t('account.delete.lastOwner')
        : t('account.delete.failed'),
    )
  }

  const cancelDeletion = async () => {
    if (!api) return
    const { response } = await api.user.DELETE('/v1/me/deletion')
    if (response.ok) {
      toast.success(t('account.delete.cancelled'))
      onChanged()
    } else toast.error(t('account.delete.failed'))
  }

  const date = (s: string) => new Date(s).toLocaleDateString(i18n.language, { dateStyle: 'long' })

  return (
    <>
      <Card header={t('account.email.title')}>
        <p className="mb-3 text-sm">{t('account.email.current', { email })}</p>
        {sent ? (
          <Alert variant="ok">{t('account.email.sent', { email: next.trim() })}</Alert>
        ) : (
          <form className="flex flex-wrap items-end gap-3" onSubmit={(e) => void changeEmail(e)}>
            <Input
              type="email"
              label={t('account.email.new')}
              value={next}
              required
              onChange={(e) => setNext(e.target.value)}
              {...(emailError ? { error: emailError } : {})}
            />
            <Button type="submit" loading={busy} disabled={!next.trim()}>
              {t('account.email.submit')}
            </Button>
          </form>
        )}
      </Card>

      <Card header={t('account.delete.title')}>
        {deletionAfter ? (
          <div className="space-y-3">
            <Alert variant="warn">
              {t('account.delete.scheduled', { date: date(deletionAfter) })}
            </Alert>
            <Button onClick={() => void cancelDeletion()}>{t('account.delete.cancel')}</Button>
          </div>
        ) : (
          <>
            <p className="mb-3 text-sm">{t('account.delete.intro')}</p>
            <Button variant="danger" onClick={() => setDeleting(true)}>
              {t('account.delete.button')}
            </Button>
          </>
        )}
      </Card>

      <Modal
        open={deleting}
        onOpenChange={(open) => {
          setDeleting(open)
          if (!open) {
            setTyped('')
            setDeleteError(null)
          }
        }}
        title={t('account.delete.confirmTitle')}
        footer={
          <Button
            variant="danger"
            loading={busy}
            disabled={typed !== CONFIRM_WORD}
            onClick={() => void scheduleDeletion()}
          >
            {t('account.delete.confirm')}
          </Button>
        }
      >
        <p className="mb-3 text-sm">{t('account.delete.warning')}</p>
        {deleteError && (
          <Alert variant="danger" className="mb-3">
            {deleteError}
          </Alert>
        )}
        <Input
          label={t('account.delete.type', { word: CONFIRM_WORD })}
          value={typed}
          autoComplete="off"
          onChange={(e) => setTyped(e.target.value)}
        />
      </Modal>
    </>
  )
}
