/**
 * Every English string, and the shape every other language must match.
 *
 * One file per namespace: `common` for the shell every app shares, and one
 * for each app's own words. Plurals use i18next's suffixes (`_one`,
 * `_other`), which follow each language's own rules through
 * `Intl.PluralRules`. `{{product}}` is the product's name, filled in from
 * the product config; no string names the product itself.
 *
 * Keep strings roughly a third shorter than the space they sit in. Most
 * languages are longer than English, and the layout is built to allow for it.
 */
import { common } from './common'
import { account } from './account'
import { admin } from './admin'
import { platform } from './platform'
import { mobile } from './mobile'

export const en = { common, account, admin, platform, mobile } as const

export type Resources = typeof en
