/**
 * Browser-only test setup. Node tests (the shared packages, the tools) skip all
 * of it; files that opt into jsdom with `@vitest-environment jsdom` get it.
 */
import { afterEach } from 'vitest'

if (typeof window !== 'undefined') {
  await import('@testing-library/jest-dom/vitest')
  const { cleanup } = await import('@testing-library/react')
  const { resetSystemTheme } = await import('./packages/ui-web/test/system-theme')

  afterEach(() => {
    cleanup()
    resetSystemTheme()
    window.localStorage.clear()
    delete document.documentElement.dataset.theme
  })
}
