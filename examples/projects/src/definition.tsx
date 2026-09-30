import type { AppDefinition, AppRoute, SessionSource } from '@b2b-template/ui-web'
import type { ReactNode } from 'react'

import { createProjectsApi, PROJECTS_PERMISSION } from './api'
import { ProjectsProvider, type ProjectsContextValue } from './context'
import { locales } from './locales'

/**
 * The app's pages, declared: the template's shell brings sign-in, the
 * layout, the permission gate and the nav entry with each. The detail path
 * is the one the backend's `project_shared` notification links to.
 */
export const routes: AppRoute[] = [
  {
    path: '/projects',
    page: () => import('./pages/ProjectsPage'),
    nav: { key: 'projects', icon: 'file', label: (t) => t('projects:nav.projects') },
  },
  {
    path: '/projects/new',
    page: () => import('./pages/NewProjectPage'),
    // Without the permission group: the template's 403 page. The API refuses anyway.
    permission: PROJECTS_PERMISSION,
  },
  { path: '/projects/:projectId', page: () => import('./pages/ProjectPage') },
  // The template's own pages around sign-in.
  {
    path: '/sign-in',
    access: 'public',
    page: () => import('@b2b-template/ui-web').then((m) => ({ default: m.SignInPage })),
  },
  {
    path: '/forgot-password',
    access: 'public',
    page: () => import('@b2b-template/ui-web').then((m) => ({ default: m.ForgotPasswordPage })),
  },
  {
    path: '/reset-password',
    access: 'public',
    page: () => import('@b2b-template/ui-web').then((m) => ({ default: m.SetPasswordPage })),
  },
  {
    path: '/mfa/setup',
    access: 'public',
    page: () => import('@b2b-template/ui-web').then((m) => ({ default: m.MfaSetupPage })),
  },
]

export interface ProjectsAppOptions {
  sessionSource: SessionSource
  /** The template's sign-in and API. Absent for a development session. */
  auth?: AppDefinition['auth']
  /** Where the projects service is; absent when the build names none. */
  projectsUrl?: string
  /** The admin app's billing page, for a plan refusal. */
  billingUrl?: string
  /** For tests: answers instead of the network, for the service and the upload. */
  fetch?: typeof globalThis.fetch
}

/**
 * The example's app definition: the template's `AppDefinition` with the
 * product's routes, nav, strings (`locales`) and, in `shell`, the projects
 * client every page shares.
 */
export function projectsApp(options: ProjectsAppOptions): AppDefinition {
  const { auth, projectsUrl, billingUrl } = options
  const upload = options.fetch ?? ((input, init) => globalThis.fetch(input, init))
  const value: ProjectsContextValue = {
    api:
      auth && projectsUrl
        ? createProjectsApi({
            baseUrl: projectsUrl,
            getToken: () => auth.getToken(),
            ...(options.fetch ? { fetch: options.fetch } : {}),
          })
        : null,
    upload,
    ...(billingUrl ? { billingUrl } : {}),
  }
  const Shell = ({ children }: { children: ReactNode }) => (
    <ProjectsProvider value={value}>{children}</ProjectsProvider>
  )
  return {
    app: 'projects',
    navNamespace: 'projects',
    locales,
    home: '/projects',
    signInPath: '/sign-in',
    routes,
    shell: Shell,
    sessionSource: options.sessionSource,
    ...(auth ? { auth } : {}),
  }
}
