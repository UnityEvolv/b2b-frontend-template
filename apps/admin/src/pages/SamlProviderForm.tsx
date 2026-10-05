import {
  Alert,
  Badge,
  Button,
  Field,
  Input,
  Radio,
  Select,
  Spinner,
  Table,
  Textarea,
  toast,
  type TableColumn,
} from '@unityevolv/unitykit'
import type { identity } from '@b2b-template/api'
import { useOrg } from '@b2b-template/ui-web'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'

import { CopyValue, refusal, TestReport } from './identity-provider-parts'

type Provider = identity.components['schemas']['IdentityProvider']
type Body = identity.components['schemas']['NewIdentityProvider']
type Report = identity.components['schemas']['IdentityProviderTest']
type Profile = identity.components['schemas']['SamlProfile']
type ServiceProvider = identity.components['schemas']['SamlServiceProvider']
type Certificate = identity.components['schemas']['SamlCertificate']

/** The metadata document's cap, as the identity service has it. */
export const MAX_METADATA_BYTES = 1024 * 1024
/** A certificate this close to its end is flagged, as the server's test warns. */
const SOON_MS = 30 * 24 * 60 * 60 * 1000

/** The attribute names a profile fills in. */
const ATTRIBUTES = [
  'email_attribute',
  'name_attribute',
  'given_name_attribute',
  'family_name_attribute',
] as const
type Attribute = (typeof ATTRIBUTES)[number]

/** Where the metadata may come from. */
const SOURCES = ['url', 'xml'] as const

/** The service provider's details, in the order the admin types them at the provider. */
const SP_FIELDS = ['entity_id', 'acs_url', 'metadata_url', 'name_id_format'] as const

export interface SamlForm extends Record<Attribute, string> {
  /** Where the metadata comes from: fetched from a URL, or the document itself. */
  source: 'url' | 'xml'
  metadata_url: string
  metadata_xml: string
  profile: string
}

/** A new SAML provider, its mapping the profile's. */
export const samlBlank = (profile?: Profile): SamlForm => ({
  source: 'url',
  metadata_url: '',
  metadata_xml: '',
  profile: profile?.profile ?? 'generic',
  email_attribute: profile?.email_attribute ?? '',
  name_attribute: profile?.name_attribute ?? '',
  given_name_attribute: profile?.given_name_attribute ?? '',
  family_name_attribute: profile?.family_name_attribute ?? '',
})

/** The form from the saved provider; uploaded metadata is never sent back, only kept. */
export const samlFromProvider = (saml: NonNullable<Provider['saml']>): SamlForm => ({
  source: saml.metadata_url ? 'url' : 'xml',
  metadata_url: saml.metadata_url ?? '',
  metadata_xml: '',
  profile: saml.profile,
  email_attribute: saml.email_attribute,
  name_attribute: saml.name_attribute,
  given_name_attribute: saml.given_name_attribute ?? '',
  family_name_attribute: saml.family_name_attribute ?? '',
})

/**
 * The request the test and the save take: `preset: saml` and the `saml`
 * settings only (an OpenID field beside them is refused). The metadata is
 * the source picked; with neither, the saved metadata is kept. An empty
 * email or name attribute is the profile's; an empty given or family name
 * attribute reads none.
 */
export function samlBodyOf(form: SamlForm): Body {
  const url = form.metadata_url.trim()
  const xml = form.metadata_xml.trim()
  return {
    preset: 'saml',
    saml: {
      ...(form.source === 'url' && url ? { metadata_url: url } : {}),
      ...(form.source === 'xml' && xml ? { metadata_xml: form.metadata_xml } : {}),
      profile: form.profile,
      email_attribute: form.email_attribute.trim() || undefined,
      name_attribute: form.name_attribute.trim() || undefined,
      given_name_attribute: form.given_name_attribute.trim(),
      family_name_attribute: form.family_name_attribute.trim(),
    },
  }
}

/** A file's text, read the way every browser (and the test DOM) supports. */
const readText = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(reader.error ?? new Error('unreadable'))
    reader.readAsText(file)
  })

/** Whether a certificate still signs, is near its end, or has ended. */
export function certificateState(notAfter: string, now = Date.now()): 'valid' | 'soon' | 'expired' {
  const end = new Date(notAfter).getTime()
  if (end <= now) return 'expired'
  return end - now < SOON_MS ? 'soon' : 'valid'
}

const STATE_BADGE = { valid: 'primary', soon: 'secondary', expired: 'danger' } as const

/** The saved SAML provider: who it is, where it signs in, and its certificates with their ends. */
export function SamlDetails({ saml }: { saml: NonNullable<Provider['saml']> }) {
  const { t, i18n } = useTranslation('admin')
  const date = (s: string) => new Date(s).toLocaleDateString(i18n.language, { dateStyle: 'medium' })
  const columns: TableColumn<Certificate>[] = [
    {
      key: 'subject',
      header: t('settings.identity.saml.certificates.subject'),
      cell: (c) => <span className="break-all">{c.subject}</span>,
      card: 'title',
    },
    {
      key: 'sha256',
      header: t('settings.identity.saml.certificates.fingerprint'),
      cell: (c) => <code className="break-all text-xs">{c.sha256}</code>,
    },
    {
      key: 'not_after',
      header: t('settings.identity.saml.certificates.validUntil'),
      cell: (c) => date(c.not_after),
    },
    {
      key: 'state',
      header: t('settings.identity.saml.certificates.state'),
      cell: (c) => {
        const state = certificateState(c.not_after)
        return (
          <Badge variant={STATE_BADGE[state]}>
            {t(`settings.identity.saml.certificates.${state}`)}
          </Badge>
        )
      },
    },
  ]
  const ending = certificateState(saml.certificates_expire_at) !== 'valid'
  return (
    <div className="space-y-2">
      <p className="break-all text-base-content/70">
        {t('settings.identity.saml.entityId', { value: saml.entity_id })}
      </p>
      <p className="break-all text-base-content/70">
        {t('settings.identity.saml.ssoUrl', { value: saml.sso_url })}
      </p>
      <p className="break-all text-base-content/70">
        {saml.metadata_url
          ? t('settings.identity.saml.metadataFrom', { value: saml.metadata_url })
          : t('settings.identity.saml.uploaded')}
      </p>
      {ending && (
        <Alert variant="warn">
          {t('settings.identity.saml.certificates.expiring', {
            date: date(saml.certificates_expire_at),
          })}
        </Alert>
      )}
      <Table
        caption={t('settings.identity.saml.certificates.title')}
        columns={columns}
        rows={saml.certificates}
        rowKey={(c) => c.sha256}
        size="sm"
      />
    </div>
  )
}

/**
 * A SAML 2.0 identity provider. What to set up at the provider (this
 * organization's entity id, ACS URL, metadata URL and NameID format) comes
 * first, since the provider's metadata exists only once that is done. Then
 * the metadata, by URL or as the document, and the attribute mapping a
 * profile fills in. As for OpenID, the settings are tested before Save is
 * offered, and the server tests them again.
 */
export function SamlProviderForm({
  profiles,
  saved,
  onSaved,
}: {
  profiles: Profile[]
  /** The organization's saved provider, of either kind. */
  saved: Provider | null
  onSaved: (provider: Provider) => void
}) {
  const { t } = useTranslation('admin')
  const org = useOrg()
  const api = org?.api
  const orgId = org?.orgId
  const savedSaml = saved?.protocol === 'saml' ? saved.saml : undefined
  const fallback = profiles.find((p) => p.profile === 'generic') ?? profiles[0]

  const [sp, setSp] = useState<ServiceProvider | null | undefined>(savedSaml?.service_provider)
  const [form, setForm] = useState<SamlForm>(() =>
    savedSaml ? samlFromProvider(savedSaml) : samlBlank(fallback),
  )
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [problem, setProblem] = useState<string | null>(null)
  const [tested, setTested] = useState<{ key: string; report: Report } | null>(null)
  const [busy, setBusy] = useState(false)
  const file = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!api || !orgId) return
    let current = true
    void api.identity
      .GET('/v1/organizations/{org_id}/identity-provider/saml-service-provider', {
        params: { path: { org_id: orgId } },
      })
      .then(({ data }) => current && setSp((was) => data ?? was ?? null))
    return () => {
      current = false
    }
  }, [api, orgId])

  if (!org) return null
  const body = samlBodyOf(form)
  const key = JSON.stringify(body)
  const hasMetadata = Boolean(body.saml?.metadata_url || body.saml?.metadata_xml)
  const complete = hasMetadata || Boolean(savedSaml)
  const passed = tested?.key === key && tested.report.ok
  const report = tested?.key === key ? tested.report : null
  const path = { params: { path: { org_id: org.orgId } } }
  const urlField = 'saml.metadata_url'
  const xmlField = 'saml.metadata_xml'

  const change = (patch: Partial<SamlForm>) => {
    setForm((f) => ({ ...f, ...patch }))
    setErrors((e) => {
      const next = { ...e }
      for (const field of Object.keys(patch)) {
        delete next[field]
        delete next[`saml.${field}`]
      }
      return next
    })
  }

  /** A profile fills in the attribute names its provider sends; they stay editable. */
  const pickProfile = (name: string) => {
    const profile = profiles.find((p) => p.profile === name)
    if (!profile) return change({ profile: name })
    change({
      profile: name,
      email_attribute: profile.email_attribute,
      name_attribute: profile.name_attribute,
      given_name_attribute: profile.given_name_attribute,
      family_name_attribute: profile.family_name_attribute,
    })
  }

  const readFile = async (chosen: File | undefined) => {
    if (!chosen) return
    if (chosen.size > MAX_METADATA_BYTES) {
      setErrors((e) => ({ ...e, [xmlField]: t('settings.identity.saml.fileTooLarge') }))
      return
    }
    try {
      change({ source: 'xml', metadata_xml: await readText(chosen) })
    } catch {
      setErrors((e) => ({ ...e, [xmlField]: t('settings.identity.saml.fileUnreadable') }))
    }
  }

  /** Server errors on the inputs they name (`saml.metadata_url`, `saml.<attribute>`); the rest in the alert. */
  const show = (message: string | undefined, byField: Record<string, string>) => {
    const placed = new Set<string>([
      form.source === 'url' ? urlField : xmlField,
      ...ATTRIBUTES.map((a) => `saml.${a}`),
      'saml.profile',
    ])
    setErrors(byField)
    const stray = Object.entries(byField).filter(([field]) => !placed.has(field))
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
    setTested(null)
    setErrors({})
    setProblem(null)
    if (data.saml) setForm(samlFromProvider(data.saml))
    onSaved(data)
  }

  return (
    <form onSubmit={save} noValidate className="space-y-4">
      <section className="space-y-2 rounded-box border border-base-300 p-4 text-sm">
        <h3 className="font-semibold">{t('settings.identity.saml.sp.title')}</h3>
        <p>{t('settings.identity.saml.sp.intro')}</p>
        {sp === undefined ? (
          <Spinner label={t('detail.loading')} />
        ) : sp === null ? (
          <Alert variant="danger">{t('settings.identity.saml.sp.failed')}</Alert>
        ) : (
          <dl className="space-y-2">
            {SP_FIELDS.map((field) => (
              <CopyValue
                key={field}
                label={t(`settings.identity.saml.sp.${field}`)}
                value={sp[field]}
              />
            ))}
          </dl>
        )}
      </section>

      <Field as="fieldset" label={t('settings.identity.saml.metadata')}>
        <div className="flex flex-wrap gap-4">
          {SOURCES.map((source) => (
            <Radio
              key={source}
              name="saml-metadata-source"
              label={t(`settings.identity.saml.sources.${source}`)}
              checked={form.source === source}
              onChange={() => change({ source })}
            />
          ))}
        </div>
      </Field>
      {form.source === 'url' ? (
        <Input
          type="url"
          required={!savedSaml}
          label={t('settings.identity.saml.metadataUrl')}
          help={
            savedSaml
              ? `${t('settings.identity.saml.metadataUrlHelp')} ${t('settings.identity.saml.keepMetadata')}`
              : t('settings.identity.saml.metadataUrlHelp')
          }
          error={errors[urlField]}
          value={form.metadata_url}
          onChange={(e) => change({ metadata_url: e.target.value })}
        />
      ) : (
        <div className="space-y-2">
          <Textarea
            rows={6}
            required={!savedSaml}
            className="font-mono text-xs"
            label={t('settings.identity.saml.metadataXml')}
            help={
              savedSaml
                ? `${t('settings.identity.saml.metadataXmlHelp')} ${t('settings.identity.saml.keepMetadata')}`
                : t('settings.identity.saml.metadataXmlHelp')
            }
            error={errors[xmlField]}
            value={form.metadata_xml}
            onChange={(e) => change({ metadata_xml: e.target.value })}
          />
          <Button size="sm" variant="secondary" onClick={() => file.current?.click()}>
            {t('settings.identity.saml.chooseFile')}
          </Button>
          <input
            ref={file}
            type="file"
            className="hidden"
            data-testid="saml-metadata-file"
            accept=".xml,application/xml,text/xml,application/samlmetadata+xml"
            onChange={(e) => {
              void readFile(e.target.files?.[0])
              e.target.value = ''
            }}
          />
        </div>
      )}

      <Select
        label={t('settings.identity.saml.profile')}
        help={t('settings.identity.saml.profileHelp')}
        value={form.profile}
        error={errors['saml.profile']}
        onChange={(e) => pickProfile(e.target.value)}
      >
        {profiles.map((p) => (
          <option key={p.profile} value={p.profile}>
            {p.label}
          </option>
        ))}
      </Select>
      <Field as="fieldset" label={t('settings.identity.saml.mapping')}>
        <div className="space-y-4">
          {ATTRIBUTES.map((attribute) => (
            <Input
              key={attribute}
              label={t(`settings.identity.saml.${attribute}`)}
              help={
                attribute === 'email_attribute'
                  ? t('settings.identity.saml.emailHelp')
                  : attribute === 'name_attribute'
                    ? undefined
                    : t('settings.identity.saml.partsHelp')
              }
              error={errors[`saml.${attribute}`]}
              value={form[attribute]}
              onChange={(e) => change({ [attribute]: e.target.value })}
            />
          ))}
        </div>
      </Field>

      {problem && <Alert variant="danger">{problem}</Alert>}
      {report && <TestReport report={report} passed={t('settings.identity.saml.passed')} />}

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="secondary" disabled={!complete || busy} onClick={() => void test()}>
          {busy ? t('settings.identity.testing') : t('settings.identity.test')}
        </Button>
        <Button type="submit" disabled={!complete || !passed || busy}>
          {t('settings.identity.save')}
        </Button>
        {complete && !passed && (
          <span className="text-sm text-base-content/70">{t('settings.identity.testFirst')}</span>
        )}
      </div>
    </form>
  )
}
