import {
  MFA_ERRORS,
  refusalKey,
  useSession,
  type MfaStatus,
  type TotpEnrolment,
} from '@b2b-template/client'
import * as Clipboard from 'expo-clipboard'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Linking, Share, Text, View } from 'react-native'

import { NS } from '../i18n'
import { requireAuth } from '../services'
import { Banner, Body, Button, Field, IconButton, Loading, Screen, Section, useColors } from '../ui'
import { QrCode } from '../ui/QrCode'

/**
 * The second factor on the phone (UO-92): enrolling with an authenticator,
 * the recovery codes shown once, and managing it. The rules and refusals
 * are the identity service's, through the same client web uses.
 */

function useMfaError() {
  const { t } = useTranslation(NS)
  return (err: unknown) => t(`mfa.errors.${refusalKey(err, MFA_ERRORS)}` as 'mfa.errors.unexpected')
}

/** A code from the authenticator, with a paste button for one copied from it. */
export function CodeField({
  value,
  onChange,
  onSubmit,
  label,
  help,
}: {
  value: string
  onChange: (code: string) => void
  onSubmit?: () => void
  label: string
  help?: string
}) {
  const { t } = useTranslation(NS)
  const paste = async () => {
    const copied = (await Clipboard.getStringAsync()).trim()
    // A six-digit code copied with spaces ("123 456") still counts.
    if (copied) onChange(/^[\d\s]+$/.test(copied) ? copied.replace(/\s/g, '') : copied)
  }
  return (
    <Field
      label={label}
      {...(help ? { help } : {})}
      value={value}
      onChangeText={onChange}
      autoCapitalize="none"
      autoCorrect={false}
      autoComplete="one-time-code"
      textContentType="oneTimeCode"
      returnKeyType="go"
      {...(onSubmit ? { onSubmitEditing: () => value.trim() && onSubmit() } : {})}
      trailing={
        <IconButton icon="paste" label={t('mobile:mfa.paste')} onPress={() => void paste()} />
      }
    />
  )
}

/** The codes, shown once: copy or share them, and say they are kept before going on. */
export function RecoveryCodes({ codes, onDone }: { codes: string[]; onDone: () => void }) {
  const { t } = useTranslation(NS)
  const colors = useColors()
  const [saved, setSaved] = useState(false)
  const [copied, setCopied] = useState(false)
  const text = `${t('mobile:mfa.codesFile')}\n\n${codes.join('\n')}\n`
  return (
    <View style={{ gap: 16 }}>
      <Banner tone="warn">{t('mfa.codesOnce')}</Banner>
      <View
        accessibilityLabel={t('mfa.codes')}
        style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}
      >
        {codes.map((code) => (
          <Text
            key={code}
            selectable
            style={{
              width: '47%',
              fontFamily: 'monospace',
              fontSize: 16,
              color: colors.text,
              padding: 6,
              backgroundColor: colors.surface,
              borderRadius: 6,
            }}
          >
            {code}
          </Text>
        ))}
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Button
            label={copied ? t('mobile:mfa.copied') : t('mobile:mfa.copyCodes')}
            icon="copy"
            variant="secondary"
            onPress={() => {
              void Clipboard.setStringAsync(text).then(() => setCopied(true))
            }}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Button
            label={t('mobile:mfa.shareCodes')}
            icon="share"
            variant="secondary"
            onPress={() => void Share.share({ message: text, title: t('mobile:mfa.codesFile') })}
          />
        </View>
      </View>
      <Button
        label={t('mfa.saved')}
        icon={saved ? 'check' : undefined}
        variant={saved ? 'secondary' : 'ghost'}
        onPress={() => setSaved((s) => !s)}
      />
      <Button label={t('continue')} onPress={onDone} disabled={!saved} />
    </View>
  )
}

/** Enrolling: the code to scan or the key to copy, a first code, then the codes. */
export function EnrolFlow({
  start,
  confirm,
  onDone,
}: {
  start: () => Promise<TotpEnrolment>
  confirm: (code: string) => Promise<string[]>
  onDone: () => void
}) {
  const { t } = useTranslation(NS)
  const colors = useColors()
  const explain = useMfaError()
  const [enrolment, setEnrolment] = useState<TotpEnrolment | null>(null)
  const [code, setCode] = useState('')
  const [codes, setCodes] = useState<string[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    start().then(setEnrolment, (err) => setError(explain(err)))
    // The secret is made once, when the flow opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const submit = async () => {
    setBusy(true)
    setError(null)
    try {
      setCodes(await confirm(code.trim()))
    } catch (err) {
      setError(explain(err))
    } finally {
      setBusy(false)
    }
  }

  const openApp = async () => {
    if (!enrolment) return
    try {
      await Linking.openURL(enrolment.otpauth_uri)
    } catch {
      setNotice(t('mobile:mfa.noApp'))
    }
  }

  if (codes) return <RecoveryCodes codes={codes} onDone={onDone} />
  return (
    <View style={{ gap: 16 }}>
      {error ? <Banner tone="danger">{error}</Banner> : null}
      {notice ? <Banner tone="info">{notice}</Banner> : null}
      {!enrolment && !error ? <Loading label={t('loading')} /> : null}
      {enrolment ? (
        <>
          <Body>{t('mobile:mfa.samePhone')}</Body>
          <Button label={t('mobile:mfa.openApp')} icon="external" onPress={() => void openApp()} />
          <Body>{t('mfa.scan')}</Body>
          <View style={{ alignItems: 'center' }}>
            <QrCode value={enrolment.otpauth_uri} label={t('mfa.qrAlt')} />
          </View>
          <Section title={t('mfa.manual')}>
            <Text selectable style={{ fontFamily: 'monospace', fontSize: 16, color: colors.text }}>
              {enrolment.secret}
            </Text>
            <Button
              label={t('mobile:mfa.copySecret')}
              icon="copy"
              variant="secondary"
              compact
              onPress={() => {
                void Clipboard.setStringAsync(enrolment.secret).then(() =>
                  setNotice(t('mobile:mfa.copied')),
                )
              }}
            />
          </Section>
          <CodeField
            label={t('mfa.firstCode')}
            help={t('mfa.firstCodeHelp')}
            value={code}
            onChange={setCode}
            onSubmit={() => void submit()}
          />
          <Button
            label={t('mfa.confirm')}
            onPress={() => void submit()}
            disabled={code.trim().length < 6}
            busy={busy}
          />
        </>
      ) : null}
    </View>
  )
}

/** Set up before the first sign-in, when the organization requires it. */
export function MfaSetupScreen({
  token,
  onBack,
  onDone,
}: {
  token: string
  onBack: () => void
  /** Back to sign-in, to sign in with the new factor. */
  onDone: () => void
}) {
  const { t } = useTranslation(NS)
  const auth = requireAuth()
  const [done, setDone] = useState(false)
  return (
    <Screen title={t('mfa.setupTitle')} onBack={onBack} backLabel={t('mobile:back')}>
      {done ? (
        <>
          <Banner tone="ok">{t('mfa.enrolled')}</Banner>
          <Button label={t('signIn.title')} onPress={onDone} />
        </>
      ) : (
        <>
          <Body>{t('mfa.requiredIntro')}</Body>
          <EnrolFlow
            start={() => auth.account.enrolAtSignIn(token)}
            confirm={(code) => auth.account.confirmAtSignIn(token, code)}
            onDone={() => setDone(true)}
          />
        </>
      )}
    </Screen>
  )
}

/** Two-step sign-in from the You tab: status, set up, new codes, turn off. */
export function SecurityScreen({ onBack }: { onBack: () => void }) {
  const { t } = useTranslation(NS)
  const auth = requireAuth()
  const explain = useMfaError()
  const { state } = useSession()
  const [status, setStatus] = useState<MfaStatus | null>(null)
  const [mode, setMode] = useState<'view' | 'enrol' | 'regenerate' | 'disable'>('view')
  const [code, setCode] = useState('')
  const [codes, setCodes] = useState<string[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const refresh = () =>
    auth.account.mfaStatus().then(
      (s) => {
        setStatus(s)
        setError(null)
      },
      (err) => setError(explain(err)),
    )
  useEffect(() => {
    void refresh()
    // Once, when the screen opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const withCode = async () => {
    setBusy(true)
    setError(null)
    try {
      if (mode === 'regenerate') setCodes(await auth.account.regenerateRecoveryCodes(code.trim()))
      if (mode === 'disable') {
        // The code is the re-authentication: turning the factor off asks for it.
        await auth.account.disableMfa(code.trim())
        setMode('view')
        await refresh()
      }
      setCode('')
    } catch (err) {
      setError(explain(err))
    } finally {
      setBusy(false)
    }
  }

  if (state.status !== 'signed-in') return null
  return (
    <Screen title={t('mfa.settingsTitle')} onBack={onBack} backLabel={t('mobile:back')}>
      {error ? <Banner tone="danger">{error}</Banner> : null}
      {!status && !error ? <Loading label={t('loading')} /> : null}
      {codes ? (
        <RecoveryCodes
          codes={codes}
          onDone={() => {
            setCodes(null)
            setMode('view')
            void refresh()
          }}
        />
      ) : null}
      {!codes && mode === 'view' && status ? (
        <View style={{ gap: 16 }}>
          <Body>
            {status.enrolled
              ? t('mfa.status.on', { left: String(status.recovery_codes_left ?? 0) })
              : t('mfa.status.off')}
          </Body>
          {status.required ? <Banner tone="info">{t('mfa.status.required')}</Banner> : null}
          {status.enrolled ? (
            <>
              <Button
                label={t('mfa.regenerate')}
                variant="secondary"
                onPress={() => setMode('regenerate')}
              />
              {status.required ? (
                <Body muted>{t('mfa.errors.required')}</Body>
              ) : (
                <Button
                  label={t('mfa.turnOff')}
                  variant="danger"
                  onPress={() => setMode('disable')}
                />
              )}
            </>
          ) : (
            <Button label={t('mfa.setUp')} onPress={() => setMode('enrol')} />
          )}
        </View>
      ) : null}
      {!codes && mode === 'enrol' ? (
        <EnrolFlow
          start={() => auth.account.enrol()}
          confirm={(c) => auth.account.confirm(c)}
          onDone={() => {
            setMode('view')
            void refresh()
          }}
        />
      ) : null}
      {!codes && (mode === 'regenerate' || mode === 'disable') ? (
        <View style={{ gap: 16 }}>
          <Body>{t(mode === 'disable' ? 'mfa.turnOffPrompt' : 'mfa.regeneratePrompt')}</Body>
          <CodeField
            label={t('signIn.mfa.code')}
            help={t('signIn.mfa.help')}
            value={code}
            onChange={setCode}
            onSubmit={() => void withCode()}
          />
          <Button
            label={mode === 'disable' ? t('mfa.turnOff') : t('continue')}
            variant={mode === 'disable' ? 'danger' : 'primary'}
            onPress={() => void withCode()}
            disabled={!code.trim()}
            busy={busy}
          />
          <Button label={t('cancel')} variant="ghost" onPress={() => setMode('view')} />
        </View>
      ) : null}
    </Screen>
  )
}
