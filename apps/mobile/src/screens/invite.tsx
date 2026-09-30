import {
  INVITE_ERRORS,
  maskEmail,
  refusalKey,
  useSession,
  VERIFY_ERRORS,
  type InvitePreview,
} from '@b2b-template/client'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { View } from 'react-native'

import { NS } from '../i18n'
import { requireAuth } from '../services'
import { Banner, Body, Button, Field, Loading, Screen } from '../ui'

/**
 * Following an invite on the phone: the invite is checked and the
 * organization shown before anything is accepted; a name is asked for when
 * the person is new. What comes next is the identity service's answer: an
 * email to confirm the address and choose a password (a local-account
 * organization), or sign-in (an existing account, or Microsoft).
 * Signed in already, accepting moves the session to the new organization,
 * so the person lands signed in there.
 */
export function InviteScreen({
  token,
  onBack,
  onSignIn,
  onDone,
}: {
  token: string
  onBack: () => void
  /** Accepted, and now to sign in: with a password, or through Microsoft. */
  onSignIn: () => void
  /** Accepted while signed in: the session moved to the new organization. */
  onDone: () => void
}) {
  const { t } = useTranslation(NS)
  const auth = requireAuth()
  const { state, reload, signOut } = useSession()
  const [preview, setPreview] = useState<InvitePreview | null>(null)
  const [error, setError] = useState<string | null>(token ? null : 'invalid')
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState<'verify_email' | 'wrong_identity' | null>(null)

  useEffect(() => {
    if (!token) return
    let current = true
    auth.account.invitePreview(token).then(
      (p) => current && setPreview(p),
      (err) => current && setError(refusalKey(err, INVITE_ERRORS)),
    )
    return () => {
      current = false
    }
  }, [auth, token])

  const signedInAs = state.status === 'signed-in' ? state.session.user : null
  const mismatch = Boolean(
    signedInAs && preview?.email_hint && maskEmail(signedInAs.email) !== preview.email_hint,
  )

  const accept = async () => {
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
          // The invite belonged to another address after all: nothing was
          // attached to this identity.
          setDone('wrong_identity')
          return
        }
        await auth.orgs.switchTo(accepted.org_id)
        onDone()
        reload()
        return
      }
      if (accepted.next === 'verify_email') setDone('verify_email')
      else onSignIn()
    } catch (err) {
      setError(refusalKey(err, INVITE_ERRORS))
    } finally {
      setBusy(false)
    }
  }

  const signOutAndContinue = async () => {
    await signOut()
    setDone(null)
  }

  return (
    <Screen title={t('invite.title')} onBack={onBack} backLabel={t('mobile:back')}>
      {error ? (
        <Banner tone={error === 'planLimit' ? 'warn' : 'danger'}>
          {t(`invite.errors.${error}` as 'invite.errors.unexpected')}
        </Banner>
      ) : null}
      {error === 'used' ? <Button label={t('signIn.title')} onPress={onSignIn} /> : null}
      {!preview && !error ? <Loading label={t('mobile:invite.checking')} /> : null}

      {preview && !error && done === null ? (
        <View style={{ gap: 16 }}>
          <Body>
            {t('invite.memberOf', {
              org: preview.org_name,
              role: t(`roles.${preview.role}` as 'roles.user'),
            })}
          </Body>
          {preview.email_hint ? (
            <Body muted>{t('invite.for', { email: preview.email_hint })}</Body>
          ) : null}
          {mismatch && signedInAs ? (
            <>
              <Banner tone="warn">
                {t('invite.mismatch', {
                  current: signedInAs.email,
                  invited: preview.email_hint ?? '',
                })}
              </Banner>
              <Button
                label={t('invite.signOutAndContinue')}
                onPress={() => void signOutAndContinue()}
              />
            </>
          ) : (
            <>
              {!signedInAs ? (
                <Field
                  label={t('invite.name')}
                  help={t('invite.nameHelp')}
                  value={name}
                  onChangeText={setName}
                  autoComplete="name"
                  textContentType="name"
                />
              ) : null}
              <Button label={t('invite.accept')} onPress={() => void accept()} busy={busy} />
            </>
          )}
        </View>
      ) : null}

      {done === 'verify_email' ? (
        <>
          <Banner tone="ok">{t('invite.accepted')}</Banner>
          <Body>{t('invite.checkInbox')}</Body>
          <Body muted>{t('mobile:invite.linkOpensHere')}</Body>
        </>
      ) : null}
      {done === 'wrong_identity' ? (
        <>
          <Banner tone="warn">{t('invite.wrongIdentity')}</Banner>
          <Button
            label={t('invite.signOutAndContinue')}
            onPress={() => void signOutAndContinue()}
          />
        </>
      ) : null}
    </Screen>
  )
}

/**
 * The link that confirms an address: on to choosing the first password
 * when the account has none, else to sign-in.
 */
export function VerifyEmailScreen({
  token,
  onBack,
  onSetPassword,
  onSignIn,
}: {
  token: string
  onBack: () => void
  onSetPassword: (setupToken: string) => void
  onSignIn: () => void
}) {
  const { t } = useTranslation(NS)
  const auth = requireAuth()
  const [error, setError] = useState<string | null>(token ? null : 'invalidLink')
  const [verified, setVerified] = useState(false)

  useEffect(() => {
    if (!token) return
    let current = true
    auth.account.verifyEmail(token).then(
      (result) => {
        if (!current) return
        if (result.setup_token) onSetPassword(result.setup_token)
        else setVerified(true)
      },
      (err) => current && setError(refusalKey(err, VERIFY_ERRORS)),
    )
    return () => {
      current = false
    }
    // Once per link: verifying spends the token.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth, token])

  return (
    <Screen title={t('verify.title')} onBack={onBack} backLabel={t('mobile:back')}>
      {error ? (
        <Banner tone="danger">
          {t(`password.errors.${error}` as 'password.errors.unexpected')}
        </Banner>
      ) : null}
      {!error && !verified ? <Loading label={t('mobile:invite.verifying')} /> : null}
      {verified ? (
        <>
          <Banner tone="ok">{t('verify.done')}</Banner>
          <Button label={t('signIn.title')} onPress={onSignIn} />
        </>
      ) : null}
    </Screen>
  )
}
