import { Alert, Button, Input, Select } from '@unityevolv/unitykit'
import {
  CAPTCHA_HEADER,
  CaptchaNotice,
  PublicCard,
  SignInPendingPage,
  useApp,
  useCaptcha,
} from '@b2b-template/ui-web'
import { useEffect, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useSearchParams } from 'react-router'

type Fields = Partial<Record<'email' | 'name' | 'org_name' | 'time_zone', string>>

const code = (error: unknown) => (error as { code?: string } | undefined)?.code
const fieldsOf = (error: unknown) =>
  ((error as { fields?: Record<string, string> } | undefined)?.fields ?? {}) as Fields

function timeZones(): string[] {
  const intl = Intl as unknown as { supportedValuesOf?: (key: string) => string[] }
  return intl.supportedValuesOf?.('timeZone') ?? ['UTC']
}

/**
 * Self-serve signup (UO-66): a stranger's email, name, organization name
 * and zone, behind a CAPTCHA. Nothing is created until the emailed link is
 * used. An address at a domain another organization has claimed is
 * refused, and the page says how to get in instead.
 */
export function SignupPage() {
  const { t } = useTranslation('admin')
  const { auth } = useApp()
  const captcha = useCaptcha('signup')
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [orgName, setOrgName] = useState('')
  const [timeZone, setTimeZone] = useState(() => Intl.DateTimeFormat().resolvedOptions().timeZone)
  const [fields, setFields] = useState<Fields>({})
  const [error, setError] = useState<'failed' | 'captcha' | null>(null)
  const [claimed, setClaimed] = useState(false)
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)

  if (!auth) return <SignInPendingPage />

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError(null)
    setFields({})
    let token: string | null = null
    try {
      token = await captcha.token()
    } catch {
      setBusy(false)
      setError('captcha')
      return
    }
    const { error: failed, response } = await auth.api.organization.POST('/v1/signups', {
      body: {
        email: email.trim(),
        name: name.trim(),
        org_name: orgName.trim(),
        time_zone: timeZone,
      },
      headers: token ? { [CAPTCHA_HEADER]: token } : {},
    })
    setBusy(false)
    if (response.status === 202) {
      setSent(true)
      return
    }
    if (response.status === 409) {
      setClaimed(true)
      return
    }
    if (response.status === 403 || code(failed)?.startsWith('captcha')) {
      setError('captcha')
      return
    }
    setFields(fieldsOf(failed))
    setError('failed')
  }

  if (sent) {
    return (
      <PublicCard title={t('signup.sentTitle')}>
        <Alert variant="ok">{t('signup.sent', { email: email.trim() })}</Alert>
      </PublicCard>
    )
  }

  if (claimed) {
    return (
      <PublicCard title={t('signup.claimedTitle')}>
        <div className="space-y-4">
          <Alert variant="warn">{t('signup.claimed')}</Alert>
          <Link to="/sign-in" className="btn btn-primary w-full">
            {t('signup.signIn')}
          </Link>
          <Button variant="ghost" className="w-full" onClick={() => setClaimed(false)}>
            {t('signup.otherAddress')}
          </Button>
        </div>
      </PublicCard>
    )
  }

  return (
    <PublicCard title={t('signup.title')}>
      <form onSubmit={(e) => void submit(e)} noValidate className="space-y-4">
        {error && <Alert variant="danger">{t(`signup.errors.${error}`)}</Alert>}
        <p className="text-sm">{t('signup.intro')}</p>
        <Input
          type="email"
          name="email"
          label={t('signup.email')}
          help={t('signup.emailHelp')}
          autoComplete="email"
          autoFocus
          required
          value={email}
          error={fields.email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Input
          name="name"
          label={t('signup.name')}
          autoComplete="name"
          required
          maxLength={200}
          value={name}
          error={fields.name}
          onChange={(e) => setName(e.target.value)}
        />
        <Input
          name="organization"
          label={t('signup.orgName')}
          autoComplete="organization"
          required
          maxLength={200}
          value={orgName}
          error={fields.org_name}
          onChange={(e) => setOrgName(e.target.value)}
        />
        <Select
          label={t('signup.timeZone')}
          value={timeZone}
          error={fields.time_zone}
          onChange={(e) => setTimeZone(e.target.value)}
        >
          {timeZones().map((zone) => (
            <option key={zone} value={zone}>
              {zone}
            </option>
          ))}
        </Select>
        <Button
          type="submit"
          className="w-full"
          disabled={busy || !email.trim() || !name.trim() || !orgName.trim()}
        >
          {t('signup.submit')}
        </Button>
        <p className="text-center text-sm">
          <Link to="/sign-in">{t('signup.haveAccount')}</Link>
        </p>
        <CaptchaNotice />
      </form>
    </PublicCard>
  )
}

/**
 * The emailed link: proves the address and creates the organization with
 * the signer-up as Owner, then goes straight on to their first password.
 */
export function SignupVerifyPage() {
  const { t } = useTranslation('admin')
  const { auth } = useApp()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const token = params.get('token') ?? ''
  const [problem, setProblem] = useState<'missing' | 'used' | 'expired' | 'failed' | null>(
    token ? null : 'missing',
  )

  useEffect(() => {
    if (!auth || !token) return
    let current = true
    void auth.api.organization
      .POST('/v1/signups/complete', { body: { token } })
      .then(({ data, error }) => {
        if (!current) return
        if (data?.setup_token) {
          navigate(`/set-password?token=${encodeURIComponent(data.setup_token)}`, { replace: true })
          return
        }
        if (data) {
          navigate('/sign-in', { replace: true })
          return
        }
        const refused = code(error) ?? ''
        setProblem(
          refused.endsWith('used') ? 'used' : refused.endsWith('expired') ? 'expired' : 'failed',
        )
      })
    return () => {
      current = false
    }
  }, [auth, token, navigate])

  if (!auth) return <SignInPendingPage />

  return (
    <PublicCard title={t('signup.verifyTitle')}>
      {problem ? (
        <div className="space-y-4">
          <Alert variant="danger">{t(`signup.verify.${problem}`)}</Alert>
          <Link to={problem === 'used' ? '/sign-in' : '/signup'} className="btn btn-primary w-full">
            {problem === 'used' ? t('signup.signIn') : t('signup.again')}
          </Link>
        </div>
      ) : (
        <p className="text-sm">{t('signup.verifying')}</p>
      )}
    </PublicCard>
  )
}
