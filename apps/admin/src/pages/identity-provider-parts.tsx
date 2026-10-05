import { Alert, Badge, Button, toast } from '@unityevolv/unitykit'
import type { identity } from '@b2b-template/api'
import { useTranslation } from 'react-i18next'

type Report = identity.components['schemas']['IdentityProviderTest']

/** The error envelope's message and per-input messages, when there are any. */
export const refusal = (error: unknown) => {
  const e = error as
    { code?: string; message?: string; fields?: Record<string, string> } | undefined
  return { code: e?.code, message: e?.message, fields: e?.fields ?? {} }
}

/** Copies a value the admin is to paste at their identity provider. */
export async function copyText(text: string, done: string) {
  await navigator.clipboard.writeText(text)
  toast.success(done)
}

/** A value to give the identity provider, with its own copy button. */
export function CopyValue({ label, value }: { label: string; value: string }) {
  const { t } = useTranslation('admin')
  const copy = (text: string) => copyText(text, t('settings.identity.copied'))
  return (
    <div className="space-y-1">
      <dt className="font-medium">{label}</dt>
      <dd className="flex items-center gap-2">
        <code className="break-all">{value}</code>
        <Button
          size="sm"
          variant="ghost"
          aria-label={t('settings.identity.copyNamed', { name: label })}
          onClick={() => void copy(value)}
        >
          {t('settings.identity.copy')}
        </Button>
      </dd>
    </div>
  )
}

/**
 * A test's checks in order, each with the server's sentence (a check after
 * a failed one is not run, so not listed), and whether a save would pass.
 */
export function TestReport({ report, passed }: { report: Report; passed?: string }) {
  const { t } = useTranslation('admin')
  return (
    <div className="space-y-2">
      <ul className="space-y-1 text-sm" aria-label={t('settings.identity.test')}>
        {report.checks.map((check) => (
          <li key={check.check} className="flex items-start gap-2">
            <Badge variant={check.ok ? 'primary' : 'danger'}>
              {check.ok ? t('settings.identity.pass') : t('settings.identity.fail')}
            </Badge>
            <span className="font-medium">
              {t(`settings.identity.checks.${check.check}`, { defaultValue: check.check })}
            </span>
            <span>{check.message}</span>
          </li>
        ))}
      </ul>
      <Alert variant={report.ok ? 'info' : 'danger'}>
        {report.ok ? (passed ?? t('settings.identity.passed')) : t('settings.identity.failed')}
      </Alert>
    </div>
  )
}
