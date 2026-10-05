import { defineConfig, devices } from '@playwright/test'

/**
 * The end-to-end tests drive the backend's local stack (README.md). One
 * worker: the tests share the stack's seeded org and its one operator.
 */
export default defineConfig({
  testDir: '.',
  testMatch: '*.spec.ts',
  workers: 1,
  timeout: 120_000,
  expect: { timeout: 15_000 },
  reporter: [['list']],
  outputDir: 'test-results',
  use: { ...devices['Desktop Chrome'], trace: 'retain-on-failure' },
})
