// @vitest-environment jsdom
import { act, cleanup, screen } from '@testing-library/react'
import {
  FIRST_PAINT_SCRIPT,
  THEME_CACHE_KEY as CONFIG_KEY,
  DARK_QUERY as CONFIG_QUERY,
} from '@b2b-template/app-config/first-paint'
import { describe, expect, it } from 'vitest'

import { memorySessionSource, type SessionSource } from './session'
import { DARK_QUERY, THEME_CACHE_KEY, useTheme } from './theme'
import { useState } from 'react'
import { renderApp, signedIn } from '../test/render-app'
import { setSystemDark } from '../test/system-theme'

const theme = () => document.documentElement.dataset.theme

/** A page that changes the theme the way the account menu does. */
function ThemePage() {
  const { preference, setPreference } = useTheme()
  const [failed, setFailed] = useState(false)
  return (
    <>
      <h1>theme page {preference}</h1>
      <button onClick={() => setPreference('dark').catch(() => setFailed(true))}>dark</button>
      {failed && <p>failed</p>}
    </>
  )
}

async function openThemePage(options: Parameters<typeof renderApp>[0] = {}) {
  const view = renderApp({
    path: '/theme',
    routes: [{ path: '/theme', page: () => Promise.resolve({ default: ThemePage }) }],
    ...options,
  })
  await screen.findByRole('heading', { name: /theme page/ })
  return view
}

async function openApp(options: Parameters<typeof renderApp>[0] = {}) {
  const view = renderApp({ path: '/users', ...options })
  await screen.findByRole('heading', { name: 'users page' })
  return view
}

describe('theme', () => {
  it('follows the system by default, and switches live when the OS does', async () => {
    await openApp()
    expect(theme()).toBe('light')

    act(() => setSystemDark(true))
    expect(theme()).toBe('dark')

    act(() => setSystemDark(false))
    expect(theme()).toBe('light')
  })

  it('uses the preference saved on the server, over the system and the cache', async () => {
    window.localStorage.setItem(THEME_CACHE_KEY, 'light')
    setSystemDark(false)
    await openApp({ session: signedIn([], { preferences: { theme: 'dark', language: null } }) })

    expect(theme()).toBe('dark')
    // The cache follows the server, so the next first paint is right.
    expect(window.localStorage.getItem(THEME_CACHE_KEY)).toBe('dark')
  })

  it('saves a new choice to the server, so it follows the person to another browser', async () => {
    const source = memorySessionSource(signedIn())
    await openThemePage({ source })

    await act(async () => screen.getByRole('button', { name: 'dark' }).click())
    expect(theme()).toBe('dark')
    expect(source.current()?.user.preferences.theme).toBe('dark')

    // A second browser: nothing cached, the same session on the server.
    cleanup()
    window.localStorage.clear()
    delete document.documentElement.dataset.theme
    await openThemePage({ source })
    expect(theme()).toBe('dark')
  })

  it('goes back to the old theme, and says so, when the server refuses the save', async () => {
    const working = memorySessionSource(signedIn())
    const source: SessionSource = {
      ...working,
      savePreferences: () => Promise.reject(new Error('offline')),
    }
    await openThemePage({ source })

    await act(async () => screen.getByRole('button', { name: 'dark' }).click())
    expect(theme()).toBe('light')
    expect(await screen.findByText('failed')).toBeInTheDocument()
  })
})

describe('first paint', () => {
  it('uses the same cache key and query as the shell', () => {
    expect(CONFIG_KEY).toBe(THEME_CACHE_KEY)
    expect(CONFIG_QUERY).toBe(DARK_QUERY)
  })

  const runScript = () => new Function(FIRST_PAINT_SCRIPT)()

  it('applies the cached theme before anything renders', () => {
    window.localStorage.setItem(THEME_CACHE_KEY, 'dark')
    runScript()
    expect(theme()).toBe('dark')
  })

  it('falls back to the system with nothing cached', () => {
    setSystemDark(true)
    runScript()
    expect(theme()).toBe('dark')
  })
})
