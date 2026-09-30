// @vitest-environment jsdom
import { PRODUCT } from '@b2b-template/product-config'
import { act, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import type { AppDefinition } from './app'
import { memorySessionSource } from './session'
import { startApp } from './start'
import { pageNamed, signedIn } from '../test/render-app'

/** An app as a product declares one, with nothing to say about the browser. */
const definition = (overrides: Partial<AppDefinition> = {}): AppDefinition => ({
  app: 'account',
  navNamespace: 'account',
  home: '/home',
  signInPath: '/sign-in',
  routes: [
    { path: '/home', page: pageNamed('home page') },
    { path: '/sign-in', access: 'public', page: pageNamed('sign-in page') },
  ],
  sessionSource: memorySessionSource(signedIn()),
  ...overrides,
})

let container: HTMLElement | null = null

function start(app: AppDefinition) {
  container = document.createElement('div')
  document.body.append(container)
  act(() => startApp(app, container!))
}

afterEach(() => {
  container?.remove()
  container = null
})

describe('startApp', () => {
  it('starts an app that needs no WebRTC in a browser without it', async () => {
    // jsdom has neither, like a browser with WebRTC and media turned off by policy.
    expect('RTCPeerConnection' in window).toBe(false)
    expect(navigator.mediaDevices?.getUserMedia).toBeUndefined()

    start(definition())
    expect(await screen.findByRole('heading', { name: 'home page' })).toBeInTheDocument()
    expect(
      screen.queryByText(`This browser cannot run ${PRODUCT.productName}`),
    ).not.toBeInTheDocument()
  })

  it('shows the unsupported page when the browser lacks what the app declares', async () => {
    const saved = window.WebSocket
    // @ts-expect-error: a browser without WebSockets.
    delete window.WebSocket
    try {
      start(definition({ capabilities: ['websocket'] }))
      expect(
        await screen.findByText(`This browser cannot run ${PRODUCT.productName}`),
      ).toBeInTheDocument()
      expect(screen.queryByRole('heading', { name: 'home page' })).not.toBeInTheDocument()
    } finally {
      window.WebSocket = saved
    }
  })
})
