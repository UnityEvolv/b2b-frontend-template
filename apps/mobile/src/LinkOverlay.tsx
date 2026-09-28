import { useEffect, useState } from 'react'
import { BackHandler, StyleSheet, View } from 'react-native'

import type { LinkTarget } from './deeplinks'
import { InviteScreen, VerifyEmailScreen } from './screens/invite'
import { MfaSetupScreen } from './screens/mfa'
import { SetPasswordScreen } from './screens/password'
import { useColors } from './ui'

/**
 * A link from an email, opened while signed in (UO-90): shown over the app,
 * which keeps running beneath. Closing it
 * goes back to where the person was.
 */
export function LinkOverlay({ target, onClose }: { target: LinkTarget; onClose: () => void }) {
  const colors = useColors()
  const [setupToken, setSetupToken] = useState<string | null>(null)

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose()
      return true
    })
    return () => sub.remove()
  }, [onClose])

  let screen
  if (setupToken !== null || target.kind === 'set-password') {
    screen = (
      <SetPasswordScreen
        token={setupToken ?? (target.kind === 'set-password' ? target.token : '')}
        onBack={onClose}
        onDone={onClose}
        onRequestNew={onClose}
      />
    )
  } else if (target.kind === 'invite') {
    screen = (
      <InviteScreen token={target.token} onBack={onClose} onSignIn={onClose} onDone={onClose} />
    )
  } else if (target.kind === 'verify-email') {
    screen = (
      <VerifyEmailScreen
        token={target.token}
        onBack={onClose}
        onSetPassword={setSetupToken}
        onSignIn={onClose}
      />
    )
  } else {
    screen = <MfaSetupScreen token={target.token} onBack={onClose} onDone={onClose} />
  }
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.background }]}>{screen}</View>
  )
}
