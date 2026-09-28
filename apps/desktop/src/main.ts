/**
 * The desktop shell: one window showing the account web app.
 *
 * Wraps the web build rather than duplicating it. Packaged, the app is served
 * from its own origin, app://account, with the same security headers the web
 * deployment sends, so storage and the policy behave as on the web. In
 * development it points at the account dev server instead.
 *
 * Around it: links into the app through its own scheme, sign-in through the
 * person's browser, the session in the keychain, updates in the background,
 * one instance at a time, and a tray to open the app, sign out or quit.
 */
// Electron's module is CommonJS with getter exports, which an ES module
// cannot pick named imports from; the default export carries them all.
import electron from 'electron'
import updaterModule from 'electron-updater'
import { createHash, randomBytes } from 'node:crypto'
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { readConfig } from './config.js'
import { deepLinkFrom, parseDeepLink, type DeepLink } from './deeplink.js'
import { APP_ID, APP_ORIGIN, DEV_URL_DEFAULT, PRODUCT_NAME, SCHEME } from './defaults.config.js'
import { contentType, navigationDecision, resolveAppPath, securityHeaders } from './policy.js'
import { readNotice, shouldNotify } from './notices.js'
import { PendingSignIn, pkcePair, systemSignInUrl } from './signin.js'
import { trayBitmap, trayItems } from './tray.js'
import { startUpdates, type Updater } from './updates.js'
import { isIdentityRequest, mergeCookieHeader, SessionVault } from './vault.js'

const {
  app,
  BrowserWindow,
  ipcMain,
  Menu,
  nativeImage,
  Notification,
  protocol,
  safeStorage,
  session,
  shell,
  Tray,
} = electron

const here = path.dirname(fileURLToPath(import.meta.url))
/** The account build and the headers it is served with, copied in by build:web. */
const webRoot = path.join(app.getAppPath(), 'web')
const smokeTest = process.argv.includes('--smoke-test')
/** Development points at the dev server unless told to use the build. */
const devUrl =
  !app.isPackaged && !process.env.DESKTOP_USE_BUILD
    ? process.env.DESKTOP_DEV_URL || DEV_URL_DEFAULT
    : null
const appOrigins = [APP_ORIGIN, ...(devUrl ? [new URL(devUrl).origin] : [])]
const appBase = devUrl ?? APP_ORIGIN

/** The addresses: the environment at launch over what the build wrote down. */
const config = readConfig(
  process.env,
  (() => {
    try {
      return JSON.parse(readFileSync(path.join(webRoot, 'desktop.json'), 'utf8')) as unknown
    } catch {
      return null
    }
  })(),
)

// The app scheme is a real origin: standard, secure, fetchable.
protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true } },
])

// One instance: a second launch (a link clicked while the app runs) hands
// its link to this one and goes. The smoke test runs beside anything.
if (!smokeTest && !app.requestSingleInstanceLock()) {
  app.quit()
  process.exit(0)
}

/** Only the app's own pages speak on the bridge. */
function fromApp(event: { senderFrame?: { url: string } | null }): boolean {
  try {
    const url = new URL(event.senderFrame?.url ?? 'about:blank')
    return appOrigins.includes(`${url.protocol}//${url.host}`)
  } catch {
    return false
  }
}

function serveApp() {
  const headers = securityHeaders(
    JSON.parse(readFileSync(path.join(webRoot, 'headers.json'), 'utf8')).headers,
    { api: config.apiOrigin ?? undefined },
  )
  protocol.handle('app', (request) => {
    const url = new URL(request.url)
    if (url.origin !== APP_ORIGIN) return new Response('', { status: 404 })
    const relative = resolveAppPath(url.pathname, (p) => existsSync(path.join(webRoot, p)))
    // The shell's own configuration is not the page's business.
    if (relative === null || relative === 'desktop.json') return new Response('', { status: 403 })
    const file = path.join(webRoot, relative)
    return new Response(readFileSync(file), {
      headers: { ...headers, 'Content-Type': contentType(file) },
    })
  })
}

function permissions() {
  // Notifications and reading the clipboard (a code pasted into a form); nothing else.
  session.defaultSession.setPermissionRequestHandler((_contents, permission, callback) => {
    callback(['notifications', 'clipboard-read'].includes(permission))
  })
}

/**
 * The session in the keychain (see vault.ts): the identity service's
 * cookies are taken off its responses, kept encrypted, and put back on each
 * request to it. A refresh it refuses forgets them.
 */
function keepSession() {
  const file = path.join(app.getPath('userData'), 'session.bin')
  const vault = new SessionVault(
    {
      read: () => (existsSync(file) ? readFileSync(file) : null),
      write: (data) => writeFileSync(file, data, { mode: 0o600 }),
      remove: () => rmSync(file, { force: true }),
    },
    {
      available: () => safeStorage.isEncryptionAvailable(),
      encrypt: (text) => safeStorage.encryptString(text),
      decrypt: (data) => safeStorage.decryptString(data),
    },
  )
  vault.load()
  const s = session.defaultSession
  s.webRequest.onBeforeSendHeaders((details, callback) => {
    if (isIdentityRequest(details.url, config.identityUrl)) {
      const kept = vault.cookies()
      if (Object.keys(kept).length > 0) {
        const name = Object.keys(details.requestHeaders).find((h) => h.toLowerCase() === 'cookie')
        const existing = name ? details.requestHeaders[name] : undefined
        if (name) delete details.requestHeaders[name]
        details.requestHeaders.Cookie = mergeCookieHeader(existing, kept)
      }
    }
    callback({ requestHeaders: details.requestHeaders })
  })
  s.webRequest.onHeadersReceived((details, callback) => {
    const headers = details.responseHeaders ?? {}
    if (isIdentityRequest(details.url, config.identityUrl)) {
      for (const name of Object.keys(headers)) {
        if (name.toLowerCase() !== 'set-cookie') continue
        vault.remember(headers[name] ?? [])
        delete headers[name]
      }
      if (
        details.statusCode === 401 &&
        new URL(details.url).pathname.endsWith('/v1/session/refresh')
      )
        vault.forget()
    }
    callback({ responseHeaders: headers })
  })
}

// Links into the app, and what the page is told of them.
const pendingSignIn = new PendingSignIn()
let rendererReady = false
const queued: Array<{ channel: string; payload: unknown }> = []
/** A link the first launch was given: where the window opens. */
let firstPath: string | null = null
/** Set once Quit is chosen: closing the window then really closes it. */
let quitting = false
/** The tray, once there is one: without it, closing the window must quit. */
let trayIcon: electron.Tray | null = null

// Windows shows notifications under the app's own name only with this.
if (process.platform === 'win32') app.setAppUserModelId(APP_ID)

function mainWindow(): electron.BrowserWindow | null {
  return BrowserWindow.getAllWindows()[0] ?? null
}

function showWindow(): electron.BrowserWindow {
  const win = mainWindow() ?? createWindow()
  if (win.isMinimized()) win.restore()
  win.show()
  win.focus()
  return win
}

/** Tell the page, or keep it until the page is listening. */
function tellPage(channel: string, payload: unknown) {
  const win = mainWindow()
  if (win && rendererReady) win.webContents.send(channel, payload)
  else queued.push({ channel, payload })
}

function handleLink(raw: string | null, cold = false) {
  if (!raw) return
  const link: DeepLink | null = parseDeepLink(raw, SCHEME)
  if (!link) return
  if (link.kind === 'open') {
    if (cold) firstPath = link.path
    else {
      showWindow()
      tellPage('b2bapp:navigate', link.path)
    }
    return
  }
  const verifier = pendingSignIn.take()
  showWindow()
  tellPage(
    'b2bapp:sign-in',
    link.code && verifier
      ? { code: link.code, verifier, next: link.next }
      : { error: link.error ?? 'attempt_expired', next: link.next },
  )
}

function bridge() {
  ipcMain.on('b2bapp:ready', (event) => {
    if (!fromApp(event)) return
    rendererReady = true
    for (const { channel, payload } of queued.splice(0)) event.sender.send(channel, payload)
  })
  // Sign-in through the organization's provider, in the person's browser.
  ipcMain.handle('b2bapp:sign-in', async (event, requested: unknown) => {
    if (!fromApp(event)) return false
    const pair = pkcePair(randomBytes, (text) => createHash('sha256').update(text).digest())
    const url = systemSignInUrl(requested, config.identityUrl, pair.challenge)
    if (!url) return false
    pendingSignIn.begin(pair.verifier)
    await shell.openExternal(url)
    return true
  })
}

function createWindow() {
  rendererReady = false
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 600,
    show: !smokeTest,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(here, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  // Closing the window keeps the app in the tray; Quit, from the tray or the
  // app menu, is the way out.
  win.on('close', (event) => {
    if (quitting || smokeTest || !trayIcon) return
    event.preventDefault()
    win.hide()
  })

  // The window shows the app and nothing else.
  win.webContents.on('will-navigate', (event, url) => {
    const decision = navigationDecision(url, appOrigins)
    if (decision === 'allow') return
    event.preventDefault()
    if (decision === 'open-externally') void shell.openExternal(url)
  })
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (navigationDecision(url, appOrigins) === 'open-externally') void shell.openExternal(url)
    return { action: 'deny' }
  })
  // A reload starts the page over: it says when it listens again.
  win.webContents.on('did-start-navigation', (details) => {
    if (details.isMainFrame && !details.isSameDocument) rendererReady = false
  })

  if (smokeTest) {
    const timer = setTimeout(() => {
      console.error('smoke test: the app did not load in time')
      app.exit(1)
    }, 30_000)
    win.webContents.once('did-finish-load', () => {
      clearTimeout(timer)
      console.log(`smoke test: loaded ${win.webContents.getURL()}`)
      app.exit(0)
    })
    win.webContents.once('did-fail-load', (_event, code, description) => {
      clearTimeout(timer)
      console.error(`smoke test: failed to load (${code} ${description})`)
      app.exit(1)
    })
  }

  const start = firstPath ?? '/'
  firstPath = null
  void win.loadURL(new URL(start, appBase).toString())
  return win
}

/**
 * System notifications: something new in the person's feed, shown only while
 * the window is not in front. A click brings the app forward on the page the
 * notice names.
 */
function notifications() {
  // Kept until they are done with, or a notification's click is lost.
  const showing = new Set<electron.Notification>()
  ipcMain.on('b2bapp:notify', (event, value: unknown) => {
    if (!fromApp(event)) return
    const notice = readNotice(value)
    if (!notice || !Notification.isSupported()) return
    const win = mainWindow()
    if (!shouldNotify(win ? { visible: win.isVisible(), focused: win.isFocused() } : null)) return
    const note = new Notification({ title: notice.title, body: notice.body })
    showing.add(note)
    const done = () => showing.delete(note)
    note.on('click', () => {
      done()
      showWindow()
      tellPage('b2bapp:navigate', notice.path)
    })
    note.on('close', done)
    note.show()
  })
}

/** The tray: open the app, sign out, quit. */
function tray() {
  const icon = new Tray(
    nativeImage
      .createFromBitmap(trayBitmap(32), { width: 32, height: 32 })
      .resize({ width: 16, height: 16 }),
  )
  trayIcon = icon
  icon.setToolTip(PRODUCT_NAME)
  icon.setContextMenu(
    Menu.buildFromTemplate(
      trayItems(PRODUCT_NAME).map((item) => {
        switch (item.kind) {
          case 'separator':
            return { type: 'separator' as const }
          case 'open':
            return { label: item.label, click: () => void showWindow() }
          case 'sign-out':
            // The page signs out, as its own menu would.
            return {
              label: item.label,
              click: () => {
                showWindow()
                tellPage('b2bapp:sign-out', null)
              },
            }
          case 'quit':
            return { label: item.label, click: () => app.quit() }
        }
      }),
    ),
  )
  icon.on('click', () => void showWindow())
}

/** The app's scheme opens this app: on install, and in development when asked. */
function registerScheme() {
  if (app.isPackaged) app.setAsDefaultProtocolClient(SCHEME)
  else if (process.env.DESKTOP_DEV_PROTOCOL === '1')
    app.setAsDefaultProtocolClient(SCHEME, process.execPath, [path.resolve(app.getAppPath())])
}

// macOS hands a link over as an event, before or after the app is ready.
app.on('open-url', (event, url) => {
  event.preventDefault()
  handleLink(url, !app.isReady())
})
// Windows and Linux: a second launch carries the link on its command line.
app.on('second-instance', (_event, argv) => {
  showWindow()
  handleLink(deepLinkFrom(argv, SCHEME))
})

app.whenReady().then(() => {
  handleLink(deepLinkFrom(process.argv, SCHEME), true)
  serveApp()
  permissions()
  keepSession()
  bridge()
  createWindow()
  if (!smokeTest) {
    registerScheme()
    notifications()
    tray()
    startUpdates(() => updaterModule.autoUpdater as unknown as Updater, config.update, {
      packaged: app.isPackaged,
      log: { info: (m) => console.log(m), warn: (m) => console.warn(m) },
    })
  }
  // The dock icon brings back a window hidden in the tray.
  app.on('activate', () => void showWindow())
})

// Quit is explicit: from the tray, the app menu or the system. Only then
// does closing the window close it.
app.on('before-quit', () => {
  quitting = true
})

app.on('window-all-closed', () => {
  // macOS keeps the app in the dock; everywhere else closing the window quits.
  if (process.platform !== 'darwin') app.quit()
})
