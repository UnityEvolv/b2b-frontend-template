import { createContext, useContext } from 'react'

/**
 * What the sign-in screen says when the app signed the person out on their
 * behalf: after leaving their last organization. Held by the app's
 * root, set just before the sign-out, spent by the sign-in screen.
 */
export type SignedOutNotice = 'leftLast'

export const NoticeContext = createContext<(notice: SignedOutNotice) => void>(() => {})

export function useSignedOutNotice(): (notice: SignedOutNotice) => void {
  return useContext(NoticeContext)
}
