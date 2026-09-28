/**
 * The signed-in app's screens and the stacks they sit in. Pure, so the
 * back button's behaviour is tested without a device.
 */
export type Route =
  /** What happened while the person was away: the notification feed. */
  | { name: 'notifications' }
  | { name: 'you' }
  /** Two-step sign-in. */
  | { name: 'security' }
  /** The profile and where the person is signed in. */
  | { name: 'profile' }
  | { name: 'sessions' }
  /** The person's organizations: switching and leaving. */
  | { name: 'organization' }

export type Tab = 'home' | 'you'

export const TABS: readonly Tab[] = ['home', 'you']

export type Stacks = Record<Tab, Route[]>

export function initialStacks(): Stacks {
  return {
    home: [{ name: 'notifications' }],
    you: [{ name: 'you' }],
  }
}

export function push(stacks: Stacks, tab: Tab, route: Route): Stacks {
  return { ...stacks, [tab]: [...stacks[tab], route] }
}

export function replace(stacks: Stacks, tab: Tab, route: Route): Stacks {
  return { ...stacks, [tab]: [...stacks[tab].slice(0, -1), route] }
}

/** One screen back; the tab's first screen stays. */
export function pop(stacks: Stacks, tab: Tab): Stacks {
  const stack = stacks[tab]
  return stack.length > 1 ? { ...stacks, [tab]: stack.slice(0, -1) } : stacks
}
