import { Alert, Button, Icon, Input } from '@unityevolv/unitykit'
import { useEffect, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useSearchParams } from 'react-router'

import {
  FORGOT_ERRORS,
  INVITE_ERRORS,
  maskEmail,
  PASSWORD_ERRORS,
  passwordAcceptable,
  passwordRules,
  refusalKey,
  VERIFY_ERRORS,
} from '@b2b-template/client'

import type { InvitePreview } from './account'
import { useApp } from './app'
import { useCaptcha } from './captcha'
import { SignInPendingPage } from './pages'
import { PublicCard, PublicLoading } from './public-card'
import { useSession } from './session'

/**
 * The pages a person reaches from an email: an invite, a
 * verification link, a password link; and the one they reach from the
 * sign-in page when they forgot their password. The rules and refusal
 * tables are shared with the phone.
 */

export { maskEmail }

/** Where someone lands when they follow an invite link. */
export function AcceptInvitePage() {
  const { t } = useTranslation()
  const { auth, home, signInPath } = useApp()
  const { state, reload } = useSession()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const token = params.get('token') ?? ''

  const [preview, setPreview] = useState<InvitePreview | null>(null)
  const [error, setError] = useState<string | null>(token ? null : 'invalid')
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState<
    'verify_email' | 'sign_in' | 'sign_in_entra' | 'wrong_identity' | null
  >(null)

  useEffect(() => {
    if (!auth || !token) return
    auth.account
      .invitePreview(token)
      .then(setPreview, (err) => setError(refusalKey(err, INVITE_ERRORS)))
  }, [auth, token])

  if (!auth) return <SignInPendingPage />
  if (state.status === 'loading' || (!preview && !error)) return <PublicLoading />

  const signedInAs = state.status === 'signed-in' ? state.session.user : null
  const mismatch =
    signedInAs && preview?.email_hint && maskEmail(signedInAs.email) !== preview.email_hint

  const accept = async (event: FormEvent) => {
    event.preventDefault()
    if (!preview) return
    setBusy(true)
    setError(null)
    try {
      const accepted = await auth.account.acceptInvite(
        token,
        signedInAs ? undefined : name.trim() || undefined,
      )
      if (signedInAs) {
        if (accepted.user_id !== signedInAs.id) {
          // The invite belonged to another address after all. Nothing was
          // attached to this identity; the membership is that other person's.
          setDone('wrong_identity')
          return
        }
        await auth.account.switchOrganization(accepted.org_id)
        reload()
        navigate(home, { replace: true })
        return
      }
      setDone(accepted.next)
    } catch (err) {
      setError(refusalKey(err, INVITE_ERRORS))
    } finally {
      setBusy(false)
    }
  }

  const signOutAndContinue = async () => {
    await auth.sessionSource.signOut()
    reload()
  }

  return (
    <PublicCard title={t('invite.title')}>
      {error && (
        <Alert variant={error === 'planLimit' ? 'warn' : 'danger'}>
          {t(`invite.errors.${error}` as never)}
        </Alert>
      )}
      {preview && !error && done === null && (
        <div className="space-y-4">
          <p>
            {t(preview.kind === 'guest' ? 'invite.guestOf' : 'invite.memberOf', {
              org: preview.org_name,
              role: t(`roles.${preview.role}` as never),
            })}
          </p>
          {preview.purpose && (
            <p className="text-sm text-base-content/70">
              {t('invite.purpose', { purpose: preview.purpose })}
            </p>
          )}
          <p className="text-sm text-base-content/70">
            {t('invite.for', { email: preview.email_hint ?? '' })}
          </p>
          {mismatch ? (
            <div className="space-y-3">
              <Alert variant="warn">
                {t('invite.mismatch', {
                  current: signedInAs.email,
                  invited: preview.email_hint ?? '',
                })}
              </Alert>
              <Button onClick={() => void signOutAndContinue()} className="w-full">
                {t('invite.signOutAndContinue')}
              </Button>
            </div>
          ) : (
            <form onSubmit={accept} noValidate className="space-y-4">
              {!signedInAs && (
                <Input
                  name="name"
                  label={t('invite.name')}
                  help={t('invite.nameHelp')}
                  autoComplete="name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              )}
              <Button type="submit" disabled={busy} className="w-full">
                {t('invite.accept')}
              </Button>
            </form>
          )}
        </div>
      )}
      {done === 'verify_email' && (
        <div className="space-y-4">
          <Alert variant="ok">{t('invite.accepted')}</Alert>
          <p>{t('invite.checkInbox')}</p>
        </div>
      )}
      {(done === 'sign_in' || done === 'sign_in_entra') && (
        <div className="space-y-4">
          <Alert variant="ok">{t('invite.accepted')}</Alert>
          <Link
            to={`${signInPath}?next=${encodeURIComponent(home)}`}
            className="btn btn-primary w-full"
          >
            {t('signIn.title')}
          </Link>
        </div>
      )}
      {done === 'wrong_identity' && (
        <div className="space-y-4">
          <Alert variant="warn">{t('invite.wrongIdentity')}</Alert>
          <Button onClick={() => void signOutAndContinue()} className="w-full">
            {t('invite.signOutAndContinue')}
          </Button>
        </div>
      )}
    </PublicCard>
  )
}

/** The verification link: proves the address, then on to the first password. */
export function VerifyEmailPage() {
  const { t } = useTranslation()
  const { auth, signInPath, home } = useApp()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const token = params.get('token') ?? ''
  const [error, setError] = useState<string | null>(token ? null : 'invalidLink')
  const [verified, setVerified] = useState(false)

  useEffect(() => {
    if (!auth || !token) return
    auth.account.verifyEmail(token).then(
      (result) => {
        if (result.setup_token) {
          navigate(`/set-password?token=${encodeURIComponent(result.setup_token)}`, {
            replace: true,
          })
          return
        }
        setVerified(true)
      },
      (err) => setError(refusalKey(err, VERIFY_ERRORS)),
    )
  }, [auth, token, navigate])

  if (!auth) return <SignInPendingPage />
  if (!error && !verified) return <PublicLoading />
  return (
    <PublicCard title={t('verify.title')}>
      {error && <Alert variant="danger">{t(`password.errors.${error}` as never)}</Alert>}
      {verified && (
        <div className="space-y-4">
          <Alert variant="ok">{t('verify.done')}</Alert>
          <Link
            to={`${signInPath}?next=${encodeURIComponent(home)}`}
            className="btn btn-primary w-full"
          >
            {t('signIn.title')}
          </Link>
        </div>
      )}
    </PublicCard>
  )
}

/** The policy as the person types: length is what matters. */
export function PasswordRules({ password, confirm }: { password: string; confirm: string }) {
  const { t } = useTranslation()
  const rules = passwordRules(password, confirm)
  return (
    <ul className="space-y-1 text-sm" aria-live="polite">
      {rules.map((rule) => (
        <li key={rule.key} className={rule.ok ? 'text-success' : 'text-base-content/70'}>
          <Icon name={rule.ok ? 'check' : 'info'} size="sm" className="mr-1 inline" />
          {t(`password.rules.${rule.key}` as never)}
        </li>
      ))}
    </ul>
  )
}

/** Setting the first password (from a setup token) or a new one (from a reset link). */
export function SetPasswordPage() {
  const { t } = useTranslation()
  const { auth, signInPath, home } = useApp()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const token = params.get('token') ?? ''
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(token ? null : 'invalidLink')
  const [busy, setBusy] = useState(false)

  if (!auth) return <SignInPendingPage />
  const valid = passwordAcceptable(password, confirm)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!valid) {
      setError(password !== confirm ? 'mismatch' : 'policy')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await auth.account.setPassword(token, password)
      navigate(`${signInPath}?next=${encodeURIComponent(home)}&set=1`, { replace: true })
    } catch (err) {
      setError(refusalKey(err, PASSWORD_ERRORS))
    } finally {
      setBusy(false)
    }
  }

  return (
    <PublicCard title={t('password.setTitle')}>
      {error && (
        <Alert variant="danger" className="mb-4">
          {t(`password.errors.${error}` as never)}
        </Alert>
      )}
      {error !== 'invalidLink' && (
        <form onSubmit={submit} noValidate className="space-y-4">
          <Input
            type="password"
            name="password"
            label={t('password.new')}
            autoComplete="new-password"
            autoFocus
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <Input
            type="password"
            name="confirm"
            label={t('password.confirm')}
            autoComplete="new-password"
            required
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
          />
          <PasswordRules password={password} confirm={confirm} />
          <Button type="submit" disabled={busy || !valid} className="w-full">
            {t('password.save')}
          </Button>
        </form>
      )}
      {error === 'invalidLink' && (
        <Link to="/forgot-password" className="btn btn-primary w-full">
          {t('password.requestNew')}
        </Link>
      )}
    </PublicCard>
  )
}

/** Forgot: an address, a link, and the same answer whatever the address. */
export function ForgotPasswordPage() {
  const { t } = useTranslation()
  const { auth } = useApp()
  const [params] = useSearchParams()
  const captcha = useCaptcha('forgot_password')
  const [email, setEmail] = useState(params.get('email') ?? '')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (!auth) return <SignInPendingPage />

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await auth.account.forgotPassword(email.trim(), await captcha.token())
      setSent(true)
    } catch (err) {
      setError(refusalKey(err, FORGOT_ERRORS))
    } finally {
      setBusy(false)
    }
  }

  return (
    <PublicCard title={t('password.forgotTitle')}>
      {sent ? (
        <Alert variant="ok">{t('password.sent')}</Alert>
      ) : (
        <form onSubmit={submit} noValidate className="space-y-4">
          {error && <Alert variant="danger">{t(`password.errors.${error}` as never)}</Alert>}
          <p className="text-sm">{t('password.forgotHelp')}</p>
          <Input
            type="email"
            name="email"
            label={t('signIn.email')}
            autoComplete="username"
            autoFocus
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <Button type="submit" disabled={busy || !email.trim()} className="w-full">
            {t('password.sendLink')}
          </Button>
        </form>
      )}
    </PublicCard>
  )
}
