import { Button, EmptyState, Spinner } from '@unityevolv/unitykit'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { isRouteErrorResponse, Link, useRouteError } from 'react-router'

import { reportError } from './error-tracking'

import type { Capability } from './capabilities'
import { useApp } from './app'

/**
 * A page shown with no layout around it: the browser check, a crash before the
 * layout rendered. It has to provide its own landmark.
 */
function Standalone({ children }: { children: ReactNode }) {
  return (
    <main id="content" className="grid min-h-dvh place-items-center bg-base-100 p-4">
      <div className="w-full max-w-lg">{children}</div>
    </main>
  )
}

function HomeLink() {
  const { t } = useTranslation()
  const { home } = useApp()
  return (
    <Link to={home} className="btn btn-primary">
      {t('goHome')}
    </Link>
  )
}

export function PageLoading() {
  const { t } = useTranslation()
  return <Spinner block size="lg" label={t('loading')} />
}

export function NotFoundPage() {
  const { t } = useTranslation()
  return (
    <EmptyState
      icon="search"
      titleAs="h2"
      title={t('errors.notFound.title')}
      description={t('errors.notFound.description')}
      action={<HomeLink />}
    />
  )
}

export function ForbiddenPage() {
  const { t } = useTranslation()
  return (
    <EmptyState
      icon="lock"
      titleAs="h2"
      title={t('errors.forbidden.title')}
      description={t('errors.forbidden.description')}
      action={<HomeLink />}
    />
  )
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  const { t } = useTranslation()
  return (
    <EmptyState
      icon="error"
      titleAs="h2"
      title={t('errors.unexpected.title')}
      description={t('errors.unexpected.description')}
      action={<Button onClick={onRetry}>{t('retry')}</Button>}
    />
  )
}

/**
 * The router's error boundary.
 *
 * A 404 from the router is a page that does not exist, not a crash, and says so.
 * Anything else is unexpected: it offers a reload, which is the one recovery
 * that works for almost everything, and never shows a stack trace.
 */
export function RouteErrorPage() {
  const error = useRouteError()
  if (isRouteErrorResponse(error) && error.status === 404) {
    return (
      <Standalone>
        <NotFoundPage />
      </Standalone>
    )
  }
  console.error(error)
  reportError(error, { where: 'route' })
  return (
    <Standalone>
      <ErrorState onRetry={() => window.location.reload()} />
    </Standalone>
  )
}

/** The session could not be loaded: usually the network. */
export function SessionErrorPage({ onRetry }: { onRetry: () => void }) {
  return (
    <Standalone>
      <ErrorState onRetry={onRetry} />
    </Standalone>
  )
}

export function UnsupportedBrowserPage({ missing }: { missing: Capability[] }) {
  const { t, i18n } = useTranslation()
  const list = new Intl.ListFormat(i18n.language, { type: 'conjunction' })
  const names = missing.map((capability) => t(`unsupported.capability.${capability}`))
  return (
    <Standalone>
      <EmptyState
        icon="alert"
        titleAs="h2"
        title={t('unsupported.title')}
        description={
          <>
            <span className="block">
              {t('unsupported.description', { missing: list.format(names) })}
            </span>
            <span className="mt-2 block">{t('unsupported.supported')}</span>
          </>
        }
      />
    </Standalone>
  )
}

/** Where no sign-in page is wired, the page a signed-out person is sent to. */
export function SignInPendingPage() {
  const { t } = useTranslation()
  return (
    <Standalone>
      <EmptyState
        icon="info"
        titleAs="h2"
        title={t('signIn.title')}
        description={t('signIn.pending')}
      />
    </Standalone>
  )
}
