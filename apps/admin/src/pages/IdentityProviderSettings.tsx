import {
  Alert,
  Badge,
  Button,
  Card,
  Checkbox,
  Input,
  Select,
  Spinner,
  toast,
} from '@unityevolv/unitykit'
import type { identity } from '@b2b-template/api'
import { useOrg, useSession } from '@b2b-template/ui-web'
import { useEffect, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'

import { SetupHint } from '../onboarding/SetupHint'
import { copyText, refusal, TestReport } from './identity-provider-parts'
import { SamlDetails, SamlProviderForm } from './SamlProviderForm'
import { SsoEnforcement } from './SsoEnforcement'

type Provider = identity.components['schemas']['IdentityProvider']
type Preset = identity.components['schemas']['IdentityProviderPreset']
type Body = identity.components['schemas']['NewIdentityProvider']
type Report = identity.components['schemas']['IdentityProviderTest']
type Profile = identity.components['schemas']['SamlProfile']

const STATUS_BADGE = {
  active: 'primary',
  pending_first_sign_in: 'secondary',
  disabled: 'danger',
} as const

/** The inputs a preset may ask for besides the client id and secret. */
type PresetField = 'issuer' | 'tenant_id' | 'hosted_domain'

export interface ProviderForm {
  preset: string
  issuer: string
  tenant_id: string
  hosted_domain: string
  client_id: string
  client_secret: string
  /** Space-separated, as typed. */
  scopes: string
  email_claim: string
  name_claim: string
  require_email_verified: boolean
}

const blank = (preset?: Preset): ProviderForm => ({
  preset: preset?.preset ?? '',
  issuer: '',
  tenant_id: '',
  hosted_domain: '',
  client_id: '',
  client_secret: '',
  scopes: preset?.scopes.join(' ') ?? '',
  email_claim: preset?.email_claim ?? '',
  name_claim: preset?.name_claim ?? '',
  require_email_verified: preset?.require_email_verified ?? false,
})

/** The form filled in from the saved provider; the secret is never returned. */
const fromProvider = (p: Provider): ProviderForm => ({
  preset: p.preset,
  issuer: p.preset === 'generic' ? p.issuer : '',
  tenant_id: p.tenant_id ?? '',
  hosted_domain: p.hosted_domain ?? '',
  client_id: p.client_id,
  client_secret: '',
  scopes: p.scopes.join(' '),
  email_claim: p.email_claim,
  name_claim: p.name_claim,
  require_email_verified: p.require_email_verified,
})

const isPresetField = (field: string): field is PresetField =>
  field === 'issuer' || field === 'tenant_id' || field === 'hosted_domain'

/** The preset's own inputs this page knows how to send. */
export const presetFields = (preset: Preset | undefined): PresetField[] =>
  (preset?.fields ?? []).filter(isPresetField)

/**
 * The request the test and the save take: only the inputs the preset asks
 * for (the server refuses one that does not belong to it), and the secret
 * only when one was typed.
 */
export function bodyOf(form: ProviderForm, preset: Preset | undefined): Body {
  const body: Body = {
    preset: form.preset,
    client_id: form.client_id.trim(),
    scopes: form.scopes.split(/[\s,]+/).filter(Boolean),
    email_claim: form.email_claim.trim() || undefined,
    name_claim: form.name_claim.trim() || undefined,
    require_email_verified: form.require_email_verified,
  }
  for (const field of presetFields(preset)) body[field] = form[field].trim()
  if (form.client_secret) body.client_secret = form.client_secret
  return body
}

/**
 * Whether the saved secret may not be reused: there is none, or the
 * preset, the provider (issuer, tenant, hosted domain) or the client id
 * changed. The server keeps a secret only for the provider it was saved
 * for, so the page asks for it again first.
 */
export function secretRequired(
  form: ProviderForm,
  preset: Preset | undefined,
  saved: Provider | null,
): boolean {
  if (!saved?.client_secret_set) return true
  if (form.preset !== saved.preset || form.client_id.trim() !== saved.client_id) return true
  return presetFields(preset).some((field) => {
    const now = form[field].trim()
    if (field === 'issuer') return now !== saved.issuer
    if (field === 'hosted_domain') return now.toLowerCase() !== (saved.hosted_domain ?? '')
    return now !== (saved.tenant_id ?? '')
  })
}

/**
 * The organization's identity provider: any OpenID Connect provider, filled
 * in from a preset the identity service lists, or a SAML 2.0 provider (a
 * preset whose protocol is saml, SamlProviderForm). The settings are
 * tested (OpenID: the discovery document, the issuer, the keys, and the
 * client id and secret at the token endpoint) before Save is offered, and
 * the server tests them again. The sso permission's alone: without it
 * nothing here is shown, and the API refuses on its own. Once a provider is
 * saved, an Owner may require it (SsoEnforcement).
 */
export function IdentityProviderSettings() {
  const { t, i18n } = useTranslation('admin')
  const org = useOrg()
  const sso = useSession().permissions.can('sso')
  const api = org?.api
  const orgId = org?.orgId

  const [presets, setPresets] = useState<Preset[] | null>(null)
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [saved, setSaved] = useState<Provider | null | undefined>(undefined)
  const [form, setForm] = useState<ProviderForm>(blank())
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [problem, setProblem] = useState<string | null>(null)
  const [tested, setTested] = useState<{ key: string; report: Report } | null>(null)
  const [busy, setBusy] = useState(false)
  const [advanced, setAdvanced] = useState(false)

  useEffect(() => {
    if (!api || !orgId || !sso) return
    let current = true
    void Promise.all([
      api.identity.GET('/v1/identity-provider-presets'),
      api.identity.GET('/v1/organizations/{org_id}/identity-provider', {
        params: { path: { org_id: orgId } },
      }),
    ]).then(([p, s]) => {
      if (!current) return
      const list = p.data?.presets ?? []
      setPresets(list)
      setProfiles(p.data?.saml_profiles ?? [])
      setSaved(s.data ?? null)
      setForm(s.data ? fromProvider(s.data) : blank(list[0]))
    })
    return () => {
      current = false
    }
  }, [api, orgId, sso])

  if (!sso || !org) return null
  const title = t('settings.identity.title')
  if (!presets || saved === undefined) {
    return (
      <Card header={title}>
        <Spinner label={t('detail.loading')} />
      </Card>
    )
  }

  const preset = presets.find((p) => p.preset === form.preset)
  const saml = preset?.protocol === 'saml'
  const fields = presetFields(preset)
  const body = bodyOf(form, preset)
  const key = JSON.stringify(body)
  const needsSecret = secretRequired(form, preset, saved)
  const complete =
    Boolean(preset) &&
    Boolean(body.client_id) &&
    fields.every((field) => Boolean(body[field])) &&
    (!needsSecret || Boolean(form.client_secret))
  const passed = tested?.key === key && tested.report.ok
  const path = { params: { path: { org_id: org.orgId } } }
  const label = (name: string) => t(`settings.identity.presets.${name}`, { defaultValue: name })

  const change = (patch: Partial<ProviderForm>) => {
    setForm((f) => ({ ...f, ...patch }))
    setErrors((e) => {
      const next = { ...e }
      for (const field of Object.keys(patch)) delete next[field]
      return next
    })
  }

  const pick = (name: string) => {
    const next = presets.find((p) => p.preset === name)
    // A new preset starts from its own scopes and claims; the client id stays.
    setForm((f) => ({ ...blank(next), client_id: f.client_id, client_secret: f.client_secret }))
    setErrors({})
    setProblem(null)
  }

  /** Server errors on the inputs they name; the rest in the alert. */
  const show = (message: string | undefined, byField: Record<string, string>) => {
    setErrors(byField)
    const inputs = new Set<string>([...fields, 'client_id', 'client_secret'])
    const advancedInputs = ['scopes', 'email_claim', 'name_claim', 'require_email_verified']
    if (advancedInputs.some((field) => field in byField)) setAdvanced(true)
    const stray = Object.entries(byField).filter(
      ([field]) => !inputs.has(field) && !advancedInputs.includes(field),
    )
    setProblem(
      message || stray.length
        ? [message, ...stray.map(([, m]) => m)].filter(Boolean).join(' ')
        : null,
    )
  }

  const test = async () => {
    setBusy(true)
    setProblem(null)
    const { data, error } = await org.api.identity.POST(
      '/v1/organizations/{org_id}/identity-provider/test',
      { ...path, body },
    )
    setBusy(false)
    if (!data) {
      setTested(null)
      const r = refusal(error)
      return show(r.message ?? t('settings.identity.failed'), r.fields)
    }
    setTested({ key, report: data })
    const failed: Record<string, string> = {}
    for (const check of data.checks)
      if (!check.ok && check.field) failed[check.field] = check.message
    show(undefined, failed)
  }

  const save = async (event: FormEvent) => {
    event.preventDefault()
    if (!passed) return
    setBusy(true)
    const { data, error } = await org.api.identity.PUT(
      '/v1/organizations/{org_id}/identity-provider',
      { ...path, body },
    )
    setBusy(false)
    if (!data) {
      // The server's own test failed (or the settings were refused): test again first.
      setTested(null)
      const r = refusal(error)
      return show(r.message ?? t('settings.identity.unreachable'), r.fields)
    }
    toast.success(t('settings.identity.saved'))
    setSaved(data)
    setForm(fromProvider(data))
    setTested(null)
    setErrors({})
    setProblem(null)
  }

  const copy = (text: string) => copyText(text, t('settings.identity.copied'))
  const redirectUri =
    tested?.report.redirect_uri ?? (saved?.protocol === 'saml' ? undefined : saved?.redirect_uri)
  const report = tested?.key === key ? tested.report : null
  const savedSaml = saved?.protocol === 'saml' ? saved.saml : undefined

  return (
    <>
      <Card header={title}>
        <div id="set_up_sso" className="space-y-4">
          {saved ? (
            <div className="space-y-1 text-sm">
              <p className="flex flex-wrap items-center gap-2">
                {savedSaml
                  ? t('settings.identity.currentSaml')
                  : t('settings.identity.current', { provider: label(saved.preset) })}
                <Badge variant={STATUS_BADGE[saved.status]}>
                  {t(`settings.identity.statuses.${saved.status}`)}
                </Badge>
              </p>
              {saved.status === 'pending_first_sign_in' && (
                <Alert variant="info">{t('settings.identity.pending')}</Alert>
              )}
              {savedSaml ? (
                <SamlDetails saml={savedSaml} />
              ) : (
                <p className="break-all text-base-content/70">
                  {t('settings.identity.issuer', { issuer: saved.issuer })}
                </p>
              )}
              {saved.verified_at && (
                <p className="text-base-content/70">
                  {t(savedSaml ? 'settings.identity.confirmedAt' : 'settings.identity.verifiedAt', {
                    when: new Date(saved.verified_at).toLocaleString(i18n.language, {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    }),
                  })}
                </p>
              )}
            </div>
          ) : (
            <>
              <SetupHint step="set_up_sso" />
              <p className="text-sm">{t('settings.identity.local')}</p>
            </>
          )}

          <Select
            label={t('settings.identity.provider')}
            placeholder={t('settings.identity.pick')}
            value={form.preset}
            error={errors.preset}
            onChange={(e) => pick(e.target.value)}
          >
            {presets.map((p) => (
              <option key={p.preset} value={p.preset}>
                {label(p.preset)}
              </option>
            ))}
          </Select>

          {saml ? (
            <SamlProviderForm
              profiles={profiles}
              saved={saved}
              onSaved={(provider) => {
                setSaved(provider)
                setForm(fromProvider(provider))
              }}
            />
          ) : (
            <form onSubmit={save} noValidate className="space-y-4">
              {fields.map((field) => (
                <Input
                  key={field}
                  required
                  label={t(`settings.identity.fields.${field}`, { defaultValue: field })}
                  help={
                    t(`settings.identity.fieldHelp.${field}`, { defaultValue: '' }) || undefined
                  }
                  error={errors[field]}
                  value={form[field]}
                  onChange={(e) => change({ [field]: e.target.value })}
                />
              ))}
              <Input
                required
                label={t('settings.identity.clientId')}
                error={errors.client_id}
                value={form.client_id}
                onChange={(e) => change({ client_id: e.target.value })}
              />
              <Input
                type="password"
                autoComplete="off"
                required={needsSecret}
                label={t('settings.identity.secret')}
                help={
                  !saved?.client_secret_set
                    ? undefined
                    : needsSecret
                      ? t('settings.identity.secretAgain')
                      : t('settings.identity.secretKept')
                }
                error={errors.client_secret}
                value={form.client_secret}
                onChange={(e) => change({ client_secret: e.target.value })}
              />

              <details
                className="text-sm"
                open={advanced}
                onToggle={(e) => setAdvanced(e.currentTarget.open)}
              >
                <summary className="cursor-pointer font-medium">
                  {t('settings.identity.advanced')}
                </summary>
                <div className="mt-3 space-y-4">
                  <Input
                    label={t('settings.identity.scopes')}
                    help={t('settings.identity.scopesHelp')}
                    error={errors.scopes}
                    value={form.scopes}
                    onChange={(e) => change({ scopes: e.target.value })}
                  />
                  <Input
                    label={t('settings.identity.emailClaim')}
                    error={errors.email_claim}
                    value={form.email_claim}
                    onChange={(e) => change({ email_claim: e.target.value })}
                  />
                  <Input
                    label={t('settings.identity.nameClaim')}
                    error={errors.name_claim}
                    value={form.name_claim}
                    onChange={(e) => change({ name_claim: e.target.value })}
                  />
                  <Checkbox
                    label={t('settings.identity.emailVerified')}
                    checked={form.require_email_verified}
                    onChange={(e) => change({ require_email_verified: e.target.checked })}
                  />
                </div>
              </details>

              {problem && <Alert variant="danger">{problem}</Alert>}

              {report && <TestReport report={report} />}

              {redirectUri && (
                <div className="space-y-1 text-sm">
                  <p>{t('settings.identity.redirect')}</p>
                  <p className="flex items-center gap-2">
                    <code className="break-all">{redirectUri}</code>
                    <Button size="sm" variant="ghost" onClick={() => void copy(redirectUri)}>
                      {t('settings.identity.copy')}
                    </Button>
                  </p>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="secondary"
                  disabled={!complete || busy}
                  onClick={() => void test()}
                >
                  {busy ? t('settings.identity.testing') : t('settings.identity.test')}
                </Button>
                <Button type="submit" disabled={!complete || !passed || busy}>
                  {t('settings.identity.save')}
                </Button>
                {complete && !passed && (
                  <span className="text-sm text-base-content/70">
                    {t('settings.identity.testFirst')}
                  </span>
                )}
              </div>
            </form>
          )}
        </div>
      </Card>
      {saved && <SsoEnforcement provider={saved} onChange={setSaved} />}
    </>
  )
}
