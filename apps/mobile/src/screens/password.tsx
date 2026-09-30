import {
  FORGOT_ERRORS,
  PASSWORD_ERRORS,
  passwordAcceptable,
  passwordRules,
  refusalKey,
} from '@b2b-template/client'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Text, View } from 'react-native'

import { NS } from '../i18n'
import { requireAuth } from '../services'
import { Banner, Body, Button, Field, Icon, IconButton, Screen, useColors } from '../ui'

/**
 * Passwords on the phone: choosing one from an invite's setup link
 * or a reset link, and asking for a reset link by email. The policy is shown
 * as the person types, from the same rules web shows.
 */

/** The rules, ticking as they are met: an icon and the words, never colour alone. */
export function PasswordRules({ password, confirm }: { password: string; confirm: string }) {
  const { t } = useTranslation(NS)
  const colors = useColors()
  return (
    <View style={{ gap: 6 }} accessibilityLiveRegion="polite">
      {passwordRules(password, confirm).map((rule) => (
        <View key={rule.key} style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <Icon name={rule.ok ? 'check' : 'info'} color={rule.ok ? colors.ok : colors.muted} />
          <Text
            style={{ color: rule.ok ? colors.text : colors.muted, fontSize: 15 }}
            accessibilityState={{ checked: rule.ok }}
          >
            {t(`password.rules.${rule.key}`)}
          </Text>
        </View>
      ))}
    </View>
  )
}

/** A password field with a show button, so a long one can be checked on a small keyboard. */
function PasswordField({
  label,
  value,
  onChange,
  shown,
  onToggle,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  shown: boolean
  onToggle: () => void
}) {
  const { t } = useTranslation(NS)
  return (
    <Field
      label={label}
      value={value}
      onChangeText={onChange}
      secureTextEntry={!shown}
      autoCapitalize="none"
      autoCorrect={false}
      autoComplete="new-password"
      textContentType="newPassword"
      trailing={
        <IconButton
          icon={shown ? 'hide' : 'show'}
          label={shown ? t('mobile:password.hide') : t('mobile:password.show')}
          active={shown}
          onPress={onToggle}
        />
      }
    />
  )
}

/** The first password (from a setup token) or a new one (from a reset link). */
export function SetPasswordScreen({
  token,
  onBack,
  onDone,
  onRequestNew,
}: {
  token: string
  onBack: () => void
  /** On to sign-in, which says the password is set. */
  onDone: () => void
  onRequestNew: () => void
}) {
  const { t } = useTranslation(NS)
  const auth = requireAuth()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [shown, setShown] = useState(false)
  const [error, setError] = useState<string | null>(token ? null : 'invalidLink')
  const [busy, setBusy] = useState(false)
  const valid = passwordAcceptable(password, confirm)

  const submit = async () => {
    if (!valid) {
      setError(password !== confirm ? 'mismatch' : 'policy')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await auth.account.setPassword(token, password)
      onDone()
    } catch (err) {
      setError(refusalKey(err, PASSWORD_ERRORS))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Screen title={t('password.setTitle')} onBack={onBack} backLabel={t('mobile:back')}>
      {error ? (
        <Banner tone="danger">
          {t(`password.errors.${error}` as 'password.errors.unexpected')}
        </Banner>
      ) : null}
      {error === 'invalidLink' ? (
        <Button label={t('password.requestNew')} onPress={onRequestNew} />
      ) : (
        <View style={{ gap: 16 }}>
          <PasswordField
            label={t('password.new')}
            value={password}
            onChange={setPassword}
            shown={shown}
            onToggle={() => setShown((s) => !s)}
          />
          <PasswordField
            label={t('password.confirm')}
            value={confirm}
            onChange={setConfirm}
            shown={shown}
            onToggle={() => setShown((s) => !s)}
          />
          <PasswordRules password={password} confirm={confirm} />
          <Button
            label={t('password.save')}
            onPress={() => void submit()}
            disabled={!valid}
            busy={busy}
          />
        </View>
      )}
    </Screen>
  )
}

/**
 * Forgot: an address, a link by email, and the same answer whatever the
 * address, so nobody learns who has an account.
 */
export function ForgotPasswordScreen({
  initialEmail,
  onBack,
}: {
  initialEmail: string
  onBack: () => void
}) {
  const { t } = useTranslation(NS)
  const auth = requireAuth()
  const [email, setEmail] = useState(initialEmail)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    setBusy(true)
    setError(null)
    try {
      // No bot check on the phone: reCAPTCHA is a web widget. The service
      // limits the endpoint by address and by caller either way.
      await auth.account.forgotPassword(email.trim(), null)
      setSent(true)
    } catch (err) {
      setError(refusalKey(err, FORGOT_ERRORS))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Screen title={t('password.forgotTitle')} onBack={onBack} backLabel={t('mobile:back')}>
      {sent ? (
        <>
          <Banner tone="ok">{t('password.sent')}</Banner>
          <Button label={t('signIn.title')} variant="secondary" onPress={onBack} />
        </>
      ) : (
        <View style={{ gap: 16 }}>
          {error ? (
            <Banner tone="danger">
              {t(`password.errors.${error}` as 'password.errors.unexpected')}
            </Banner>
          ) : null}
          <Body>{t('password.forgotHelp')}</Body>
          <Field
            label={t('signIn.email')}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            keyboardType="email-address"
            textContentType="username"
            returnKeyType="send"
            onSubmitEditing={() => email.trim() && void submit()}
          />
          <Button
            label={t('password.sendLink')}
            onPress={() => void submit()}
            disabled={!email.trim()}
            busy={busy}
          />
        </View>
      )}
    </Screen>
  )
}
