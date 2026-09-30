import type { ProductLocales } from '@b2b-template/i18n'

import { projects } from './en'

/**
 * The i18n seam: the example's namespace, declared on the template's
 * `ProductResources` so `t('projects:…')` is checked by the compiler like
 * the template's own keys. Nothing in the template names it.
 */
declare module '@b2b-template/i18n' {
  interface ProductResources {
    projects: typeof projects
  }
}

/** Handed to the shell by the app definition (`locales`). */
export const locales = { en: { projects } } satisfies ProductLocales
