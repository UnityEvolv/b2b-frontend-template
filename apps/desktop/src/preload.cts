/**
 * The preload runs in the sandbox with a narrow bridge: the web app learns it
 * is inside the shell and which platform, and each capability is one named
 * function. Nothing of Electron crosses: no ipcRenderer, no event objects,
 * only plain values, and main checks every one of them again.
 *
 * CommonJS, because a sandboxed preload cannot be an ES module. Every channel
 * carries the `b2bapp:` prefix; main.ts uses the same names.
 */
import electron = require('electron')

const { contextBridge, ipcRenderer } = electron

/** Listen on a channel from main; the page gets the payload and an unsubscribe. */
function listen(channel: string, handler: (payload: unknown) => void): () => void {
  const wrapped = (_event: unknown, payload: unknown) => handler(payload)
  ipcRenderer.on(channel, wrapped)
  // The page listens now: anything main kept for it arrives.
  ipcRenderer.send('b2bapp:ready')
  return () => {
    ipcRenderer.removeListener(channel, wrapped)
  }
}

contextBridge.exposeInMainWorld('b2bappDesktop', {
  platform: process.platform,
  version: process.env.npm_package_version ?? '',
  // Sign-in through the organization's provider happens in the browser.
  signInWithBrowser: (startUrl: string): Promise<boolean> =>
    ipcRenderer.invoke('b2bapp:sign-in', String(startUrl)) as Promise<boolean>,
  onSignIn: (handler: (result: unknown) => void) => listen('b2bapp:sign-in', handler),
  // A link into the app, or the tray, asks for a page.
  onNavigate: (handler: (path: unknown) => void) => listen('b2bapp:navigate', handler),
  // System notifications while the window is not in front.
  notify: (notice: unknown) => ipcRenderer.send('b2bapp:notify', notice),
  // The tray asks the page to sign the person out.
  onSignOut: (handler: () => void) => listen('b2bapp:sign-out', () => handler()),
})
