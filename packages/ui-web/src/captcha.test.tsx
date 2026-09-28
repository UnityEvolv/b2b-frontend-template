// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react'
import { createI18n } from '@b2b-template/i18n'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { AppProvider, type AppDefinition } from './app'
import {
  CAPTCHA_HEADER,
  CaptchaNotice,
  loadCaptcha,
  resetCaptchaLoader,
  useCaptcha,
  type CaptchaEnvironment,
} from './captcha'
import { I18nProvider } from './i18n'
import { memorySessionSource, SessionProvider } from './session'

/** A fake widget: `execute` answers with a token naming the action. */
function fakeWidget() {
  return {
    ready: (fn: () => void) => fn(),
    execute: vi.fn((siteKey: string, { action }: { action: string }) =>
      Promise.resolve(`token:${siteKey}:${action}`),
    ),
  }
}

/** A page environment whose script tag "loads" by installing the fake widget. */
function environment(
  widget = fakeWidget(),
  fail = false,
): CaptchaEnvironment & { scripts: HTMLScriptElement[] } {
  const env = {
    scripts: [] as HTMLScriptElement[],
    grecaptcha: undefined as CaptchaEnvironment['grecaptcha'],
    document: {
      createElement: (tag: string) => document.createElement(tag) as HTMLScriptElement,
      querySelector: () => null,
      head: {
        appendChild: (node: Node) => {
          const script = node as HTMLScriptElement
          env.scripts.push(script)
          queueMicrotask(() => {
            if (fail) {
              script.onerror?.(new Event('error'))
              return
            }
            env.grecaptcha = widget
            script.onload?.(new Event('load'))
          })
          return node
        },
      },
    } as unknown as CaptchaEnvironment['document'],
  }
  return env
}

const definition = (siteKey?: string) =>
  ({
    app: 'admin',
    home: '/',
    signInPath: '/sign-in',
    routes: [],
    captcha: siteKey ? { siteKey } : undefined,
  }) as unknown as AppDefinition

function Harness({
  siteKey,
  env,
  onHook,
}: {
  siteKey?: string
  env?: CaptchaEnvironment
  onHook: (h: ReturnType<typeof useCaptcha>) => void
}) {
  const { app, home, signInPath, routes, captcha } = definition(siteKey)
  return (
    <AppProvider value={{ app, home, signInPath, routes, captcha }}>
      <SessionProvider source={memorySessionSource(null)}>
        <I18nProvider i18n={createI18n('en')}>
          <Probe env={env} onHook={onHook} />
          <CaptchaNotice />
        </I18nProvider>
      </SessionProvider>
    </AppProvider>
  )
}

function Probe({
  env,
  onHook,
}: {
  env?: CaptchaEnvironment
  onHook: (h: ReturnType<typeof useCaptcha>) => void
}) {
  const hook = useCaptcha('signup', env)
  onHook(hook)
  return <span data-testid="state">{hook.state}</span>
}

describe('captcha on public forms', () => {
  beforeEach(() => resetCaptchaLoader())
  afterEach(cleanup)

  it('without a site key loads nothing, sends nothing and shows no notice', async () => {
    let hook!: ReturnType<typeof useCaptcha>
    const env = environment()
    render(<Harness env={env} onHook={(h) => (hook = h)} />)
    expect(hook.enabled).toBe(false)
    expect(screen.getByTestId('state').textContent).toBe('off')
    expect(await hook.token()).toBe('')
    expect(await hook.headers()).toEqual({})
    expect(env.scripts).toHaveLength(0)
    expect(screen.queryByTestId('captcha-notice')).toBeNull()
  })

  it('with a site key loads the widget once and hands over a token for the action', async () => {
    let hook!: ReturnType<typeof useCaptcha>
    const widget = fakeWidget()
    const env = environment(widget)
    render(<Harness siteKey="site-key" env={env} onHook={(h) => (hook = h)} />)
    expect(hook.enabled).toBe(true)
    await act(async () => {
      await loadCaptcha('site-key', env)
    })
    expect(screen.getByTestId('state').textContent).toBe('ready')
    expect(env.scripts).toHaveLength(1)
    expect(env.scripts[0]!.src).toContain('render=site-key')

    expect(await hook.headers()).toEqual({ [CAPTCHA_HEADER]: 'token:site-key:signup' })
    expect(widget.execute).toHaveBeenCalledWith('site-key', { action: 'signup' })
    // A second token does not load the script again.
    await hook.token()
    expect(env.scripts).toHaveLength(1)
    // The notice reCAPTCHA's terms require is shown.
    expect(screen.getByTestId('captcha-notice').textContent).toContain('protected by reCAPTCHA')
  })

  it('reports a widget that failed to load, and retries on the next ask', async () => {
    let hook!: ReturnType<typeof useCaptcha>
    const env = environment(fakeWidget(), true)
    render(<Harness siteKey="site-key" env={env} onHook={(h) => (hook = h)} />)
    await act(async () => {
      await loadCaptcha('site-key', env).catch(() => undefined)
    })
    expect(screen.getByTestId('state').textContent).toBe('failed')
    await expect(hook.token()).rejects.toThrow('failed to load')
    expect(env.scripts.length).toBeGreaterThanOrEqual(2)
  })
})
