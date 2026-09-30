import { PRODUCT, recoveryCodesFile } from '@b2b-template/product-config'
import { Alert, Button, Checkbox, Input } from '@unityevolv/unitykit'
import QRCode from 'qrcode'
import { useEffect, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router'

import { MFA_ERRORS, refusalKey } from '@b2b-template/client'

import type { MfaStatus, TotpEnrolment } from './account'
import { useApp } from './app'
import { ForbiddenPage, SignInPendingPage } from './pages'
import { PublicCard, PublicLoading } from './public-card'
import { useSession } from './session'

/**
 * The second factor: enrolling with an authenticator app, the
 * recovery codes shown once, and managing it from the profile. The challenge
 * at sign-in is on the sign-in page.
 */

function errorKey(err: unknown): string {
  return refusalKey(err, MFA_ERRORS)
}

/** The QR code an app scans, and the secret for typing by hand. */
function Enrolment({ enrolment }: { enrolment: TotpEnrolment }) {
  const { t } = useTranslation()
  const [image, setImage] = useState<string | null>(null)
  useEffect(() => {
    let current = true
    QRCode.toDataURL(enrolment.otpauth_uri, { margin: 1, width: 192 }).then(
      (url) => current && setImage(url),
      () => current && setImage(null),
    )
    return () => {
      current = false
    }
  }, [enrolment.otpauth_uri])
  return (
    <div className="space-y-3">
      <p className="text-sm">{t('mfa.scan')}</p>
      {image && (
        <img src={image} alt={t('mfa.qrAlt')} width={192} height={192} className="mx-auto" />
      )}
      <details className="text-sm">
        <summary className="cursor-pointer">{t('mfa.manual')}</summary>
        <code className="mt-2 block break-all rounded bg-base-200 p-2">{enrolment.secret}</code>
      </details>
    </div>
  )
}

/** The codes, shown once: download, then acknowledge before going on. */
export function RecoveryCodes({ codes, onDone }: { codes: string[]; onDone: () => void }) {
  const { t } = useTranslation()
  const [saved, setSaved] = useState(false)
  const file = `data:text/plain;charset=utf-8,${encodeURIComponent(`${PRODUCT.productName} recovery codes\n\n${codes.join('\n')}\n`)}`
  return (
    <div className="space-y-4">
      <Alert variant="warn">{t('mfa.codesOnce')}</Alert>
      <ul className="grid grid-cols-2 gap-2 font-mono text-sm" aria-label={t('mfa.codes')}>
        {codes.map((code) => (
          <li key={code}>{code}</li>
        ))}
      </ul>
      <a href={file} download={recoveryCodesFile()} className="btn btn-outline w-full">
        {t('mfa.download')}
      </a>
      <Checkbox
        label={t('mfa.saved')}
        checked={saved}
        onChange={(event) => setSaved(event.target.checked)}
      />
      <Button onClick={onDone} disabled={!saved} className="w-full">
        {t('continue')}
      </Button>
    </div>
  )
}

/** Enrolling: the secret, a first code, the codes. Shared by both flows. */
function EnrolFlow({
  start,
  confirm,
  onDone,
}: {
  start: () => Promise<TotpEnrolment>
  confirm: (code: string) => Promise<string[]>
  onDone: () => void
}) {
  const { t } = useTranslation()
  const [enrolment, setEnrolment] = useState<TotpEnrolment | null>(null)
  const [code, setCode] = useState('')
  const [codes, setCodes] = useState<string[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    start().then(setEnrolment, (err) => setError(errorKey(err)))
    // The secret is made once, when the page opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      setCodes(await confirm(code.trim()))
    } catch (err) {
      setError(errorKey(err))
    } finally {
      setBusy(false)
    }
  }

  if (codes) return <RecoveryCodes codes={codes} onDone={onDone} />
  return (
    <div className="space-y-4">
      {error && <Alert variant="danger">{t(`mfa.errors.${error}` as never)}</Alert>}
      {enrolment && (
        <form onSubmit={submit} noValidate className="space-y-4">
          <Enrolment enrolment={enrolment} />
          <Input
            name="code"
            label={t('mfa.firstCode')}
            help={t('mfa.firstCodeHelp')}
            autoComplete="one-time-code"
            inputMode="numeric"
            required
            value={code}
            onChange={(event) => setCode(event.target.value)}
          />
          <Button type="submit" disabled={busy || code.trim().length < 6} className="w-full">
            {t('mfa.confirm')}
          </Button>
        </form>
      )}
    </div>
  )
}

/** Set up before the first sign-in, when the organization requires it. */
export function MfaSetupPage() {
  const { t } = useTranslation()
  const { auth, signInPath } = useApp()
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const [done, setDone] = useState(false)
  if (!auth) return <SignInPendingPage />
  return (
    <PublicCard title={t('mfa.setupTitle')}>
      {!token && <Alert variant="danger">{t('mfa.errors.expired')}</Alert>}
      {token && !done && (
        <>
          <p className="mb-4 text-sm">{t('mfa.requiredIntro')}</p>
          <EnrolFlow
            start={() => auth.account.enrolAtSignIn(token)}
            confirm={(code) => auth.account.confirmAtSignIn(token, code)}
            onDone={() => setDone(true)}
          />
        </>
      )}
      {done && (
        <div className="space-y-4">
          <Alert variant="ok">{t('mfa.enrolled')}</Alert>
          <Link to={signInPath} className="btn btn-primary w-full">
            {t('signIn.title')}
          </Link>
        </div>
      )}
    </PublicCard>
  )
}

/** Managing the second factor from the profile: status, codes, removal. */
export function MfaSettingsPage() {
  const { t } = useTranslation()
  const { auth } = useApp()
  const { state } = useSession()
  const [status, setStatus] = useState<MfaStatus | null>(null)
  const [mode, setMode] = useState<'view' | 'enrol' | 'regenerate' | 'disable'>('view')
  const [code, setCode] = useState('')
  const [codes, setCodes] = useState<string[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const refresh = () => auth?.account.mfaStatus().then(setStatus, (err) => setError(errorKey(err)))
  useEffect(() => {
    void refresh()
    // Once, when the page opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!auth) return <SignInPendingPage />
  if (state.status !== 'signed-in') return <ForbiddenPage />
  if (!status && !error) return <PublicLoading />

  const withCode = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      if (mode === 'regenerate') setCodes(await auth.account.regenerateRecoveryCodes(code.trim()))
      if (mode === 'disable') {
        await auth.account.disableMfa(code.trim())
        setMode('view')
        await refresh()
      }
      setCode('')
    } catch (err) {
      setError(errorKey(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <h1 className="mb-6 text-2xl font-semibold">{t('mfa.settingsTitle')}</h1>
      <div className="max-w-md space-y-4">
        {error && <Alert variant="danger">{t(`mfa.errors.${error}` as never)}</Alert>}
        {codes && (
          <RecoveryCodes
            codes={codes}
            onDone={() => {
              setCodes(null)
              setMode('view')
              void refresh()
            }}
          />
        )}
        {!codes && mode === 'view' && status && (
          <div className="space-y-4">
            <p>
              {status.enrolled
                ? t('mfa.status.on', { left: String(status.recovery_codes_left ?? 0) })
                : t('mfa.status.off')}
            </p>
            {status.required && <Alert variant="info">{t('mfa.status.required')}</Alert>}
            {status.enrolled ? (
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" onClick={() => setMode('regenerate')}>
                  {t('mfa.regenerate')}
                </Button>
                {!status.required && (
                  <Button variant="secondary" onClick={() => setMode('disable')}>
                    {t('mfa.turnOff')}
                  </Button>
                )}
              </div>
            ) : (
              <Button onClick={() => setMode('enrol')}>{t('mfa.setUp')}</Button>
            )}
          </div>
        )}
        {!codes && mode === 'enrol' && (
          <EnrolFlow
            start={() => auth.account.enrol()}
            confirm={(c) => auth.account.confirm(c)}
            onDone={() => {
              setMode('view')
              void refresh()
            }}
          />
        )}
        {!codes && (mode === 'regenerate' || mode === 'disable') && (
          <form onSubmit={withCode} noValidate className="space-y-4">
            <p className="text-sm">
              {t(mode === 'disable' ? 'mfa.turnOffPrompt' : 'mfa.regeneratePrompt')}
            </p>
            <Input
              name="code"
              label={t('signIn.mfa.code')}
              help={t('signIn.mfa.help')}
              autoComplete="one-time-code"
              required
              value={code}
              onChange={(event) => setCode(event.target.value)}
            />
            <div className="flex gap-2">
              <Button type="submit" disabled={busy || !code.trim()}>
                {t('continue')}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setMode('view')}>
                {t('cancel')}
              </Button>
            </div>
          </form>
        )}
      </div>
    </>
  )
}
