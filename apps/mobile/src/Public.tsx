import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { BackHandler } from 'react-native'

import type { LinkTarget } from './deeplinks'
import { NS } from './i18n'
import type { SignedOutNotice } from './notice'
import { InviteScreen, VerifyEmailScreen } from './screens/invite'
import { MfaSetupScreen } from './screens/mfa'
import { ForgotPasswordScreen, SetPasswordScreen } from './screens/password'
import { SignInScreen } from './screens/SignInScreen'

/**
 * Everything before sign-in: the sign-in screen, what
 * it leads to, and what a link in an email opens. A stack of its own, with
 * the hardware back button popping it.
 */
export type PublicRoute =
  | { name: 'sign-in'; notice?: Notice }
  | { name: 'forgot'; email: string }
  | { name: 'set-password'; token: string }
  | { name: 'mfa-setup'; token: string }
  | { name: 'invite'; token: string }
  | { name: 'verify-email'; token: string }

type Notice = 'passwordSet' | 'enrolled' | 'inviteAccepted' | SignedOutNotice

/** Where a link from an email starts the signed-out app. */
export function publicRouteFor(target: LinkTarget | null): PublicRoute | null {
  if (!target) return null
  switch (target.kind) {
    case 'invite':
      return { name: 'invite', token: target.token }
    case 'verify-email':
      return { name: 'verify-email', token: target.token }
    case 'set-password':
      return { name: 'set-password', token: target.token }
    case 'mfa-setup':
      return { name: 'mfa-setup', token: target.token }
  }
}

const NOTICES = {
  passwordSet: 'mobile:password.setDone',
  enrolled: 'mfa.enrolled',
  inviteAccepted: 'mobile:invite.acceptedSignIn',
  leftLast: 'mobile:leave.leftLast',
} as const

/**
 * `start` is read once, and `onStarted` then says the link was taken, so it
 * does not open again after sign-in. A new link remounts the flow with a
 * new key.
 */
export function PublicFlow({
  start,
  onStarted,
}: {
  start?: PublicRoute | null
  onStarted?: () => void
}) {
  const { t } = useTranslation(NS)
  const [stack, setStack] = useState<PublicRoute[]>(() =>
    !start
      ? [{ name: 'sign-in' }]
      : start.name === 'sign-in'
        ? [start]
        : [{ name: 'sign-in' }, start],
  )
  const started = Boolean(start)
  useEffect(() => {
    if (started) onStarted?.()
    // Once, on arriving with a link.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const route = stack[stack.length - 1]!
  const push = useCallback((next: PublicRoute) => setStack((all) => [...all, next]), [])
  const replace = useCallback(
    (next: PublicRoute) => setStack((all) => [...all.slice(0, -1), next]),
    [],
  )
  const back = useCallback(() => setStack((all) => (all.length > 1 ? all.slice(0, -1) : all)), [])
  const home = useCallback(
    (notice?: Notice) => setStack([{ name: 'sign-in', ...(notice ? { notice } : {}) }]),
    [],
  )

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (stack.length < 2) return false
      back()
      return true
    })
    return () => sub.remove()
  }, [stack.length, back])

  switch (route.name) {
    case 'sign-in':
      return (
        <SignInScreen
          key={route.notice ?? 'plain'}
          notice={route.notice ? t(NOTICES[route.notice]) : null}
          onForgot={(email) => push({ name: 'forgot', email })}
          onEnrol={(token) => push({ name: 'mfa-setup', token })}
        />
      )
    case 'forgot':
      return <ForgotPasswordScreen initialEmail={route.email} onBack={back} />
    case 'set-password':
      return (
        <SetPasswordScreen
          token={route.token}
          onBack={back}
          onDone={() => home('passwordSet')}
          onRequestNew={() => setStack([{ name: 'sign-in' }, { name: 'forgot', email: '' }])}
        />
      )
    case 'mfa-setup':
      return <MfaSetupScreen token={route.token} onBack={back} onDone={() => home('enrolled')} />
    case 'invite':
      return (
        <InviteScreen
          token={route.token}
          onBack={back}
          onSignIn={() => home('inviteAccepted')}
          onDone={() => home()}
        />
      )
    case 'verify-email':
      return (
        <VerifyEmailScreen
          token={route.token}
          onBack={back}
          onSetPassword={(token) => replace({ name: 'set-password', token })}
          onSignIn={() => home()}
        />
      )
  }
}
