import { Alert, Button, Card, Input, Spinner } from '@unityevolv/unitykit'
import { CALLBACK_ERRORS, safeNext, SIGN_IN_ERRORS } from '@b2b-template/client'
import { useEffect, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useSearchParams } from 'react-router'

import { useApp } from './app'
import { SignInRefused, type MfaStep } from './auth'
import { Brand } from './brand'
import { desktopBridge } from './desktop'
import { SignInPendingPage } from './pages'
import { useSession } from './session'

/**
 * Where employees and guests sign in.
 *
 * The page cannot know which organization someone belongs to before they
 * say who they are, so it starts with the email address. A domain claimed
 * by an organization with an identity provider sends the browser there; a
 * local organization, an unknown domain or a guest gets the password field.
 * The page never names an organization: the redirect to a provider shows
 * that the domain uses one, and that is all.
 */

type Step = 'email' | 'password' | 'mfa' | 'enroll' | 'browser'

/** The refusal tables and the return path are shared with the phone. */
export { safeNext }
const REFUSALS = SIGN_IN_ERRORS

export function SignInPage() {
  const { auth } = useApp()
  if (!auth) return <SignInPendingPage />
  return <SignInForm />
}

function SignInForm() {
  const { t } = useTranslation()
  const { signupPath, home, auth } = useApp()
  const { state, reload } = useSession()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const next = safeNext(params.get('next'), home)

  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [mfa, setMfa] = useState<MfaStep | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(() => {
    const code = params.get('error')
    return code ? (CALLBACK_ERRORS[code] ?? 'unexpected') : null
  })

  // Signed in, by this page or already: on to where they were going.
  useEffect(() => {
    if (state.status === 'signed-in') navigate(next, { replace: true })
  }, [state.status, navigate, next])

  const refused = auth?.reason()
  const failed = (err: unknown) => {
    if (err instanceof SignInRefused) {
      setError(REFUSALS[err.code] ?? 'unexpected')
      if (err.code === 'mfa.challenge_expired') setStep('email')
      return
    }
    setError('unexpected')
  }

  /** To the organization's identity provider, through `/v1/sign-in/start?email=…`. */
  const toProvider = async () => {
    if (!auth) return
    // In the desktop app the provider's page opens in the person's own
    // browser, and the sign-in comes back into the app.
    const desktop = desktopBridge()
    if (desktop?.signInWithBrowser) {
      const opened = await desktop.signInWithBrowser(
        auth.signIn.ssoStartUrl(email.trim(), next, 'desktop'),
      )
      if (opened) setStep('browser')
      else setError('unexpected')
      return
    }
    window.location.assign(auth.signIn.ssoStartUrl(email.trim(), next))
  }

  const submitEmail = async (event: FormEvent) => {
    event.preventDefault()
    if (!auth) return
    setBusy(true)
    setError(null)
    try {
      const method = await auth.signIn.methods(email.trim())
      if (method === 'sso') return await toProvider()
      setStep('password')
    } catch (err) {
      failed(err)
    } finally {
      setBusy(false)
    }
  }

  const submitPassword = async (event: FormEvent) => {
    event.preventDefault()
    if (!auth) return
    setBusy(true)
    setError(null)
    try {
      const result = await auth.signIn.local(email.trim(), password)
      setPassword('')
      if (result.kind === 'signed-in') {
        reload()
        return
      }
      setMfa(result.step)
      setStep(result.step.mfa === 'enroll' ? 'enroll' : 'mfa')
    } catch (err) {
      failed(err)
    } finally {
      setBusy(false)
    }
  }

  const submitCode = async (event: FormEvent) => {
    event.preventDefault()
    if (!auth || !mfa?.challenge_token) return
    setBusy(true)
    setError(null)
    try {
      await auth.signIn.mfa(mfa.challenge_token, code.trim())
      setCode('')
      reload()
    } catch (err) {
      failed(err)
    } finally {
      setBusy(false)
    }
  }

  if (state.status === 'loading' || state.status === 'signed-in') {
    return (
      <main id="content" className="grid min-h-dvh place-items-center bg-base-100 p-4">
        <Spinner block size="lg" label={t('loading')} />
      </main>
    )
  }

  return (
    <main id="content" className="grid min-h-dvh place-items-center bg-base-100 p-4">
      <Card className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <Brand />
        </div>
        <h1 className="mb-4 text-2xl font-semibold">{t('signIn.title')}</h1>
        {refused === 'signed_out' && !error && (
          <Alert variant="info" className="mb-4">
            {t('signIn.signedOut')}
          </Alert>
        )}
        {refused && refused !== 'signed_out' && !error && (
          <Alert variant="warn" className="mb-4">
            {t(refused === 'not_staff' ? 'signIn.errors.notStaff' : 'signIn.errors.notAdmin')}
          </Alert>
        )}
        {error && (
          <Alert variant="danger" className="mb-4">
            {t(`signIn.errors.${error}` as never)}
          </Alert>
        )}
        {error === 'ssoRequired' && (
          // The password was right, but the organization signs this domain
          // in through its identity provider (sso.required).
          <Button className="mb-4 w-full" disabled={busy} onClick={() => void toProvider()}>
            {t('signIn.ssoContinue')}
          </Button>
        )}

        {step === 'email' && (
          <form onSubmit={submitEmail} noValidate className="space-y-4">
            <Input
              type="email"
              name="email"
              label={t('signIn.email')}
              help={t('signIn.emailHelp')}
              autoComplete="username"
              autoFocus
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            <Button type="submit" disabled={busy || !email.trim()} className="w-full">
              {t('signIn.continue')}
            </Button>
            {signupPath && (
              <p className="text-center text-sm">
                <Link to={signupPath}>{t('signIn.createOrganization')}</Link>
              </p>
            )}
          </form>
        )}

        {step === 'password' && (
          <form onSubmit={submitPassword} noValidate className="space-y-4">
            <p className="text-sm">{t('signIn.as', { email: email.trim() })}</p>
            <Input
              type="password"
              name="password"
              label={t('signIn.password')}
              autoComplete="current-password"
              autoFocus
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            <Button type="submit" disabled={busy || !password} className="w-full">
              {t('signIn.title')}
            </Button>
            <div className="flex justify-between text-sm">
              <button type="button" className="link" onClick={() => setStep('email')}>
                {t('signIn.changeEmail')}
              </button>
              <Link
                to={`/forgot-password?email=${encodeURIComponent(email.trim())}`}
                className="link"
              >
                {t('signIn.forgot')}
              </Link>
            </div>
          </form>
        )}

        {step === 'mfa' && (
          <form onSubmit={submitCode} noValidate className="space-y-4">
            <p className="text-sm">{t('signIn.mfa.prompt')}</p>
            <Input
              type="text"
              name="code"
              label={t('signIn.mfa.code')}
              help={t('signIn.mfa.help')}
              autoComplete="one-time-code"
              inputMode="numeric"
              autoFocus
              required
              value={code}
              onChange={(event) => setCode(event.target.value)}
            />
            <Button type="submit" disabled={busy || !code.trim()} className="w-full">
              {t('signIn.continue')}
            </Button>
          </form>
        )}

        {step === 'browser' && (
          <div className="space-y-4">
            <Alert variant="info">{t('signIn.browser.body')}</Alert>
            <Button variant="ghost" className="w-full" onClick={() => setStep('email')}>
              {t('signIn.browser.again')}
            </Button>
          </div>
        )}

        {step === 'enroll' && mfa?.enrollment_token && (
          <div className="space-y-4">
            <Alert variant="info">{t('signIn.mfa.enrollRequired')}</Alert>
            <Link
              to={`/mfa/setup?token=${encodeURIComponent(mfa.enrollment_token)}`}
              className="btn btn-primary w-full"
            >
              {t('signIn.mfa.setUp')}
            </Link>
          </div>
        )}
      </Card>
    </main>
  )
}
