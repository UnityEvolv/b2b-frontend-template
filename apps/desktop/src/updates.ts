/**
 * Updates (UO-117): checked and downloaded in the background, applied the
 * next time the app starts, so nobody is interrupted mid-task. The feed is
 * configuration (a generic web folder or a GitHub repository's releases);
 * with none configured, or in development, nothing is checked at all.
 */
import type { UpdateFeed } from './config.js'

/** Checked this often while the app runs, besides once at start. */
export const CHECK_EVERY_MS = 4 * 60 * 60_000

/** The little of electron-updater's AppUpdater this uses. */
export interface Updater {
  autoDownload: boolean
  autoInstallOnAppQuit: boolean
  setFeedURL(options: Record<string, string>): void
  checkForUpdates(): Promise<unknown>
  on(event: 'error', handler: (error: Error) => void): unknown
  on(event: 'update-downloaded', handler: (info: { version?: string }) => void): unknown
}

export interface UpdateLog {
  info(message: string): void
  warn(message: string): void
}

/**
 * Start checking; returns the stop. Harmless without a feed: nothing is set
 * up and nothing is fetched.
 */
export function startUpdates(
  /** Made only when there is something to check: constructing one reads the install. */
  makeUpdater: () => Updater,
  feed: UpdateFeed | null,
  options: {
    packaged: boolean
    log: UpdateLog
    every?: (fn: () => void, ms: number) => () => void
  },
): () => void {
  if (!feed || !options.packaged) {
    options.log.info(
      feed ? 'updates: not checked in development' : 'updates: no feed configured, not checked',
    )
    return () => {}
  }
  const updater = makeUpdater()
  updater.autoDownload = true
  updater.autoInstallOnAppQuit = true
  updater.setFeedURL(
    feed.provider === 'generic'
      ? { provider: 'generic', url: feed.url }
      : { provider: 'github', owner: feed.owner, repo: feed.repo },
  )
  // A failed check is said and forgotten: the next one may work.
  updater.on('error', (error) => options.log.warn(`updates: ${error.message}`))
  updater.on('update-downloaded', (info) =>
    options.log.info(`updates: ${info.version ?? 'an update'} is ready for the next start`),
  )
  const check = () => {
    updater.checkForUpdates().catch((error: unknown) => {
      options.log.warn(`updates: ${error instanceof Error ? error.message : String(error)}`)
    })
  }
  check()
  const every =
    options.every ??
    ((fn, ms) => {
      const timer = setInterval(fn, ms)
      return () => clearInterval(timer)
    })
  return every(check, CHECK_EVERY_MS)
}
