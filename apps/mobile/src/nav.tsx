import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { BackHandler } from 'react-native'

import { initialStacks, pop, push, replace, type Route, type Stacks, type Tab } from './routes'

/**
 * Moving between screens: a stack per tab, and the hardware back button
 * popping it. Small on purpose; the app has a handful of screens, and a
 * navigation library's native screens are one more thing to link.
 */
export interface Navigation {
  tab: Tab
  route: Route
  depth: number
  setTab(tab: Tab): void
  push(route: Route): void
  replace(route: Route): void
  back(): void
  /** Start a tab again from this route, or its own first screen. */
  reset(tab: Tab, route?: Route): void
}

const NavContext = createContext<Navigation | null>(null)

export function NavigationRoot({
  children,
  start,
}: {
  children: ReactNode
  start?: { tab: Tab; route?: Route }
}) {
  const [tab, setTab] = useState<Tab>(start?.tab ?? 'home')
  const [stacks, setStacks] = useState<Stacks>(() => {
    const stacks = initialStacks()
    if (start?.route) stacks[start.tab] = [start.route]
    return stacks
  })
  const stack = stacks[tab]
  const route = stack[stack.length - 1]!

  const back = useCallback(() => {
    if (stacks[tab].length > 1) setStacks((all) => pop(all, tab))
    else if (tab !== 'home') setTab('home')
  }, [stacks, tab])

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (stacks[tab].length > 1 || tab !== 'home') {
        back()
        return true
      }
      // At the root of the first tab: the system's own back leaves the app.
      return false
    })
    return () => sub.remove()
  }, [back, stacks, tab])

  const value = useMemo<Navigation>(
    () => ({
      tab,
      route,
      depth: stack.length,
      setTab,
      push: (next) => setStacks((all) => push(all, tab, next)),
      replace: (next) => setStacks((all) => replace(all, tab, next)),
      back,
      reset: (which, next) => {
        setStacks((all) => ({ ...all, [which]: [next ?? initialStacks()[which][0]!] }))
        setTab(which)
      },
    }),
    [tab, route, stack.length, back],
  )
  return <NavContext.Provider value={value}>{children}</NavContext.Provider>
}

export function useNavigation(): Navigation {
  const value = useContext(NavContext)
  if (!value) throw new Error('useNavigation is used outside NavigationRoot')
  return value
}
