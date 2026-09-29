import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: [
      'packages/**/*.test.{ts,tsx,mjs}',
      'apps/**/*.test.{ts,tsx}',
      'tools/**/*.test.{ts,mjs}',
    ],
    // Node by default; a browser test opts in with `// @vitest-environment jsdom`.
    environment: 'node',
    setupFiles: ['./vitest.setup.ts'],
    // The page tests render whole apps in jsdom; with every file running at
    // once on a loaded machine one can take longer than the default five seconds.
    testTimeout: 20_000,
  },
})
