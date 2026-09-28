// @vitest-environment jsdom
import { screen, waitFor, within } from '@testing-library/react'
import axe from 'axe-core'
import { describe, expect, it } from 'vitest'

import { memorySessionSource, type SessionSource } from './session'
import { renderApp, signedIn } from '../test/render-app'

describe('routing', () => {
  it('sends / to the home page, inside the layout', async () => {
    const { router } = renderApp({ path: '/' })
    expect(await screen.findByRole('heading', { name: 'users page' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/users')
    expect(screen.getByRole('main')).toBeInTheDocument()
  })

  it('sends a signed-out visitor to sign-in, remembering where they were going', async () => {
    const { router } = renderApp({ path: '/users?tab=invited', session: null })
    expect(await screen.findByRole('heading', { name: 'sign-in page' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/sign-in')
    expect(new URLSearchParams(router.state.location.search).get('next')).toBe('/users?tab=invited')
  })

  it('shows the 403 page for a route the person lacks the permission for', async () => {
    renderApp({ path: '/billing' })
    expect(await screen.findByText('You do not have access to this page')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'billing page' })).not.toBeInTheDocument()
  })

  it('opens the page once the permission is granted', async () => {
    renderApp({ path: '/billing', session: signedIn(['billing.read']) })
    expect(await screen.findByRole('heading', { name: 'billing page' })).toBeInTheDocument()
  })

  it('shows the 404 page for an unknown address, still inside the layout', async () => {
    renderApp({ path: '/nowhere' })
    expect(await screen.findByText('Page not found')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Go to the start page' })).toHaveAttribute(
      'href',
      '/users',
    )
  })

  it('offers a retry when the session cannot be loaded', async () => {
    let fail = true
    const working = memorySessionSource(signedIn())
    const source: SessionSource = {
      ...working,
      load: () => (fail ? Promise.reject(new Error('offline')) : working.load()),
    }
    renderApp({ path: '/users', source })

    const retry = await screen.findByRole('button', { name: 'Try again' })
    fail = false
    retry.click()
    expect(await screen.findByRole('heading', { name: 'users page' })).toBeInTheDocument()
  })
})

describe('navigation', () => {
  it('hides what the person cannot reach, and marks where they are', async () => {
    renderApp({ path: '/users' })
    await screen.findByRole('heading', { name: 'users page' })

    const nav = screen.getAllByRole('navigation', { name: 'Navigation' })[0]!
    expect(within(nav).getByRole('link', { name: 'Users' })).toHaveAttribute('aria-current', 'page')
    expect(within(nav).queryByRole('link', { name: 'Billing' })).not.toBeInTheDocument()
  })

  it('shows an entry once its permission is granted', async () => {
    renderApp({ path: '/users', session: signedIn(['billing.read']) })
    await screen.findByRole('heading', { name: 'users page' })
    const nav = screen.getAllByRole('navigation', { name: 'Navigation' })[0]!
    expect(within(nav).getByRole('link', { name: 'Billing' })).toBeInTheDocument()
  })

  it('names the account menu after the person, and offers a skip link', async () => {
    renderApp({ path: '/users' })
    await screen.findByRole('heading', { name: 'users page' })
    expect(screen.getByRole('button', { name: 'Account menu for Asha Rao' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Skip to content' })).toHaveAttribute(
      'href',
      '#content',
    )
  })
})

describe('accessibility', () => {
  it('has no axe violations in the layout', async () => {
    const { container } = renderApp({ path: '/users' })
    await screen.findByRole('heading', { name: 'users page' })
    const results = await axe.run(container, {
      // jsdom does not lay anything out or compute colours; contrast is checked
      // against the token pairs in unitykit, and in the browser.
      rules: { 'color-contrast': { enabled: false } },
    })
    expect(results.violations.map((violation) => violation.id)).toEqual([])
  })

  it('has no axe violations on the error pages', async () => {
    const { container } = renderApp({ path: '/nowhere' })
    await screen.findByText('Page not found')
    await waitFor(async () => {
      const results = await axe.run(container, { rules: { 'color-contrast': { enabled: false } } })
      expect(results.violations.map((violation) => violation.id)).toEqual([])
    })
  })
})
