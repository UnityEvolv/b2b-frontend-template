import {
  CALLBACK_ERRORS,
  refusalKey,
  SIGN_IN_ERRORS,
  SignInRefused,
  useSession,
  type MfaStep,
} from '@b2b-template/client'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, Text, View } from 'react-native'

import { NS } from '../i18n'
import { signInWithProvider } from '../platform/sso'
import { CodeField } from './mfa'
import { requireAuth } from '../services'
import { Banner, Body, Button, Field, Screen, Title } from '../ui/kit'
import { useColors } from '../ui/theme'

type Step = 'email' | 'password' | 'mfa' | 'enroll'

/**
 * Sign-in on the phone: the same email-first page as web. The
 * address decides: a domain whose organization signs in through its own identity provider
 * goes to the system browser, anything else (a local organization, a guest)
 * gets the password field. A second factor is asked for when the
 * organization or the person has one. The page never names an organization.
 */
export function SignInScreen({
  onForgot,
  onEnrol,
  notice,
}: {
  /** To the reset-request screen, with the address typed so far. */
  onForgot?: (email: string) => void
  /** To the authenticator set-up the organization requires, with its token. */
  onEnrol?: (enrollmentToken: string) => void
  /** Something to say first: a password was just set, an invite accepted. */
  notice?: string | null
}) {
  const { t } = useTranslation(NS)
  const auth = requireAuth()
  const { reload } = useSession()
  const colors = useColors()
  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [mfa, setMfa] = useState<MfaStep | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [ssoRequired, setSsoRequired] = useState(false)
  const address = email.trim()

  const failed = (err: unknown) => {
    const key = refusalKey(err, SIGN_IN_ERRORS)
    setError(t(`signIn.errors.${key}` as 'signIn.errors.unexpected'))
    // The right password, but the organization requires single sign-on.
    setSsoRequired(err instanceof SignInRefused && err.code === 'sso.required')
    if (err instanceof SignInRefused && err.code === 'mfa.challenge_expired') setStep('email')
  }

  const run = async (work: () => Promise<void>) => {
    setBusy(true)
    setError(null)
    setInfo(null)
    setSsoRequired(false)
    try {
      await work()
    } catch (err) {
      failed(err)
    } finally {
      setBusy(false)
    }
  }

  /** Through the organization's identity provider, in the system browser. */
  const toProvider = async () => {
    setInfo(t('mobile:signIn.opening'))
    const outcome = await signInWithProvider(auth.signIn, address)
    setInfo(null)
    if (outcome.kind === 'signed-in') reload()
    else if (outcome.kind === 'cancelled') setInfo(t('mobile:signIn.cancelled'))
    else {
      const key = CALLBACK_ERRORS[outcome.code] ?? 'unexpected'
      setError(t(`signIn.errors.${key}` as 'signIn.errors.unexpected'))
    }
  }

  const submitEmail = () =>
    run(async () => {
      const method = await auth.signIn.methods(address)
      if (method === 'local') {
        setStep('password')
        return
      }
      await toProvider()
    })

  const submitPassword = () =>
    run(async () => {
      const result = await auth.signIn.local(address, password)
      setPassword('')
      if (result.kind === 'signed-in') {
        reload()
        return
      }
      setMfa(result.step)
      setStep(result.step.mfa === 'enroll' ? 'enroll' : 'mfa')
    })

  const submitCode = () =>
    run(async () => {
      if (!mfa?.challenge_token) return
      await auth.signIn.mfa(mfa.challenge_token, code.trim())
      setCode('')
      reload()
    })

  return (
    <Screen>
      <View style={{ gap: 8, marginTop: 24 }}>
        <Text style={{ color: colors.accent, fontSize: 18, fontWeight: '700' }}>
          {t('mobile:title')}
        </Text>
        <Title>{t('signIn.title')}</Title>
      </View>
      {notice ? <Banner tone="ok">{notice}</Banner> : null}
      {error ? <Banner tone="danger">{error}</Banner> : null}
      {info ? <Banner tone="info">{info}</Banner> : null}
      {ssoRequired ? (
        <Button label={t('signIn.ssoContinue')} onPress={() => void run(toProvider)} busy={busy} />
      ) : null}

      {step === 'email' && (
        <View style={{ gap: 16 }}>
          <Body muted>{t('mobile:signIn.intro')}</Body>
          <Field
            label={t('signIn.email')}
            help={t('signIn.emailHelp')}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            keyboardType="email-address"
            textContentType="username"
            returnKeyType="next"
            onSubmitEditing={() => address && void submitEmail()}
            autoFocus
          />
          <Button
            label={t('signIn.continue')}
            onPress={() => void submitEmail()}
            disabled={!address}
            busy={busy}
          />
        </View>
      )}

      {step === 'password' && (
        <View style={{ gap: 16 }}>
          <Body>{t('signIn.as', { email: address })}</Body>
          <Field
            label={t('signIn.password')}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            autoComplete="current-password"
            textContentType="password"
            returnKeyType="go"
            onSubmitEditing={() => password && void submitPassword()}
            autoFocus
          />
          <Button
            label={t('signIn.title')}
            onPress={() => void submitPassword()}
            disabled={!password}
            busy={busy}
          />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Link label={t('signIn.changeEmail')} onPress={() => setStep('email')} />
            {onForgot ? (
              <Link label={t('signIn.forgot')} onPress={() => onForgot(address)} />
            ) : null}
          </View>
        </View>
      )}

      {step === 'mfa' && (
        <View style={{ gap: 16 }}>
          <Body>{t('signIn.mfa.prompt')}</Body>
          <CodeField
            label={t('signIn.mfa.code')}
            help={t('signIn.mfa.help')}
            value={code}
            onChange={setCode}
            onSubmit={() => void submitCode()}
          />
          <Button
            label={t('signIn.continue')}
            onPress={() => void submitCode()}
            disabled={!code.trim()}
            busy={busy}
          />
          <Link label={t('signIn.changeEmail')} onPress={() => setStep('email')} />
        </View>
      )}

      {step === 'enroll' && mfa?.enrollment_token && (
        <View style={{ gap: 16 }}>
          <Banner tone="info">{t('signIn.mfa.enrollRequired')}</Banner>
          {onEnrol ? (
            <Button
              label={t('signIn.mfa.setUp')}
              onPress={() => onEnrol(mfa.enrollment_token ?? '')}
            />
          ) : null}
        </View>
      )}
    </Screen>
  )
}

export function Link({ label, onPress }: { label: string; onPress: () => void }) {
  const colors = useColors()
  return (
    <Pressable onPress={onPress} accessibilityRole="link" hitSlop={8}>
      <Text style={{ color: colors.secondary, fontSize: 15, textDecorationLine: 'underline' }}>
        {label}
      </Text>
    </Pressable>
  )
}
