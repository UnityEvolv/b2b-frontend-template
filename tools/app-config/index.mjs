/**
 * The Vite configuration every web app uses.
 *
 * One place for the build rules, so a new one reaches account, admin and platform
 * together and none of them can quietly miss it.
 */
import { sentryVitePlugin } from '@sentry/vite-plugin'
import tailwind from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

import { FIRST_PAINT_SCRIPT } from './first-paint.mjs'
import { DEV_CONNECT, DEV_IMAGES, DEV_NONCE, securityHeaders } from './headers.mjs'

export { DARK_QUERY, FIRST_PAINT_SCRIPT, THEME_CACHE_KEY } from './first-paint.mjs'
export * from './headers.mjs'

function firstPaintTheme() {
  return {
    name: 'b2b-template:first-paint-theme',
    transformIndexHtml: () => [
      { tag: 'script', children: FIRST_PAINT_SCRIPT, injectTo: 'head-prepend' },
    ],
  }
}

/**
 * Upload source maps to Sentry when the build has a token and names the
 * Sentry organization and project (SENTRY_AUTH_TOKEN, SENTRY_ORG,
 * SENTRY_PROJECT), so a browser stack trace shows the file and line rather
 * than a minified bundle. The maps are deleted from the build after upload;
 * they never ship to users. Without them (a laptop, CI), nothing happens.
 */
function sourceMapsToSentry() {
  const token = process.env.SENTRY_AUTH_TOKEN
  const org = process.env.SENTRY_ORG
  const project = process.env.SENTRY_PROJECT
  if (!token || !org || !project) return []
  return [
    sentryVitePlugin({
      org,
      project,
      authToken: token,
      telemetry: false,
      sourcemaps: { filesToDeleteAfterUpload: ['./dist/**/*.map'] },
    }),
  ]
}

/**
 * @param {{ port: number }} options Each app gets its own dev port, so all three run at once.
 */
export function defineAppConfig({ port }) {
  // The dev server sends the same security headers production will, with the
  // policy report-only so a violation shows in the console instead of a
  // blank page. Vite tags the scripts it injects in development with a nonce
  // the dev policy names; production HTML has no injected scripts.
  const headers = securityHeaders({ connect: DEV_CONNECT, images: DEV_IMAGES, dev: true })
  return defineConfig(({ command }) => ({
    plugins: [react(), tailwind(), firstPaintTheme(), ...sourceMapsToSentry()],
    build: { sourcemap: true },
    ...(command === 'serve' ? { html: { cspNonce: DEV_NONCE } } : {}),
    server: { port, strictPort: true, headers },
    preview: { port, strictPort: true, headers },
  }))
}
