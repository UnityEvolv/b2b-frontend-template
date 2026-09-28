import { describe, expect, it, vi } from 'vitest'

import { readConfig, updateFeed } from './config'
import { CHECK_EVERY_MS, startUpdates, type Updater } from './updates'

describe('the shell’s configuration', () => {
  it('reads the build’s file, with the environment at launch over it', () => {
    const config = readConfig(
      { DESKTOP_API_ORIGIN: 'https://api.launch.test' },
      {
        DESKTOP_API_ORIGIN: 'https://api.build.test/',
        DESKTOP_UPDATE_URL: 'https://updates.build.test/desktop',
      },
    )
    expect(config).toEqual({
      apiOrigin: 'https://api.launch.test',
      identityUrl: 'https://api.launch.test/identity',
      update: { provider: 'generic', url: 'https://updates.build.test/desktop' },
    })
  })

  it('names the identity service on its own on a laptop, and nothing without configuration', () => {
    expect(readConfig({ DESKTOP_IDENTITY_ORIGIN: 'http://localhost:8093' }, null).identityUrl).toBe(
      'http://localhost:8093',
    )
    expect(readConfig({}, null)).toEqual({
      apiOrigin: null,
      identityUrl: null,
      update: null,
    })
    expect(
      readConfig({ DESKTOP_API_ORIGIN: 'javascript:alert(1)' }, 'nonsense').apiOrigin,
    ).toBeNull()
  })

  it('takes an update feed over https or from a GitHub repository, nothing else', () => {
    expect(updateFeed({ DESKTOP_UPDATE_GITHUB: 'example/desktop-releases' })).toEqual({
      provider: 'github',
      owner: 'example',
      repo: 'desktop-releases',
    })
    expect(updateFeed({ DESKTOP_UPDATE_URL: 'http://updates.example.test' })).toBeNull()
    expect(updateFeed({ DESKTOP_UPDATE_GITHUB: 'not a repo' })).toBeNull()
    expect(updateFeed({})).toBeNull()
  })
})

describe('updates in the background', () => {
  function fakeUpdater() {
    const handlers: Record<string, (value: never) => void> = {}
    const updater = {
      autoDownload: false,
      autoInstallOnAppQuit: false,
      setFeedURL: vi.fn(),
      checkForUpdates: vi.fn(() => Promise.resolve(null)),
      on: vi.fn((event: string, handler: (value: never) => void) => {
        handlers[event] = handler
      }),
    }
    return { updater: updater as unknown as Updater & typeof updater, handlers }
  }
  const log = () => ({ info: vi.fn(), warn: vi.fn() })

  it('does nothing without a feed, or in development', () => {
    const make = vi.fn()
    startUpdates(make, null, { packaged: true, log: log() })
    startUpdates(
      make,
      { provider: 'generic', url: 'https://u.test' },
      { packaged: false, log: log() },
    )
    expect(make).not.toHaveBeenCalled()
  })

  it('downloads in the background, installs on quit, and checks again later', async () => {
    const { updater, handlers } = fakeUpdater()
    const every = vi.fn(() => () => {})
    const logged = log()
    startUpdates(
      () => updater,
      { provider: 'github', owner: 'o', repo: 'r' },
      { packaged: true, log: logged, every },
    )
    expect(updater.autoDownload).toBe(true)
    expect(updater.autoInstallOnAppQuit).toBe(true)
    expect(updater.setFeedURL).toHaveBeenCalledWith({ provider: 'github', owner: 'o', repo: 'r' })
    expect(updater.checkForUpdates).toHaveBeenCalledTimes(1)
    expect(every).toHaveBeenCalledWith(expect.any(Function), CHECK_EVERY_MS)
    handlers.error!(new Error('offline') as never)
    expect(logged.warn).toHaveBeenCalledWith('updates: offline')
  })
})
