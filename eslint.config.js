/**
 * One lint configuration for the whole workspace.
 *
 * The recommended sets are the easy part. What matters is which boundary rule
 * applies where: those are the repo layout's promises, and this file is where
 * they stop being prose.
 */
import js from '@eslint/js'
import globals from 'globals'
import i18next from 'eslint-plugin-i18next'
import reactHooks from 'eslint-plugin-react-hooks'
import tseslint from 'typescript-eslint'

/**
 * Packages a React Native app imports, so none of them may touch the DOM.
 * `ui-web` is deliberately absent: it exists to hold the web half.
 */
const AGNOSTIC = [
  'packages/api/**/*.ts',
  'packages/client/**/*.{ts,tsx}',
  'packages/core/**/*.ts',
  'packages/i18n/**/*.ts',
  'packages/theme/**/*.ts',
]

const DOM_GLOBALS = [
  'window',
  'document',
  'navigator',
  'location',
  'history',
  'localStorage',
  'sessionStorage',
  'indexedDB',
  'HTMLElement',
  'customElements',
  'matchMedia',
  'getComputedStyle',
].map((name) => ({
  name,
  message: `${name} is browser-only. Shared packages run on React Native too; put this in ui-web and pass it in.`,
}))

/** React packages: the web UI and the three apps. */
const UI = ['packages/ui-web/**/*.{ts,tsx}', 'apps/*/src/**/*.{ts,tsx}']

const NO_URLS = [
  {
    selector: 'Literal[value=/^(https?|wss?):\\/\\//]',
    message:
      'No absolute URLs in code. Hosts come from configuration derived from the base hostname.',
  },
  {
    selector: 'TemplateElement[value.raw=/^(https?|wss?):\\/\\//]',
    message:
      'No absolute URLs in code. Hosts come from configuration derived from the base hostname.',
  },
]

/**
 * Colours come from unitykit tokens: primary, secondary, ok, warn, danger,
 * info and the base surfaces. A hex value, a colour function or one of
 * Tailwind's default palette names is a colour that ignores the theme.
 */
const COLOUR = String.raw`((^|[^\w&])#([0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b|\b(rgba?|hsla?|oklch|oklab|lab|lch|color-mix)\(|\b(bg|text|border|ring|fill|stroke|from|via|to|outline|decoration|divide|shadow|accent|caret|placeholder)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|white|black)\b)`
const NO_COLOURS = ['Literal', 'TemplateElement'].map((node) => ({
  selector:
    node === 'Literal' ? `Literal[value=/${COLOUR}/]` : `TemplateElement[value.raw=/${COLOUR}/]`,
  message:
    'No hard-coded colours. Use a unitykit token class (primary, secondary, ok, warn, danger, info, base-*).',
}))

/**
 * The words a person reads or hears. Everything else on an element (a
 * variant, an icon name, a class) is configuration and may be a literal.
 */
const USER_FACING_ATTRIBUTES = [
  'aria-label',
  'aria-description',
  'aria-placeholder',
  'aria-roledescription',
  'aria-valuetext',
  'title',
  'placeholder',
  'alt',
  'label',
  'description',
  'content',
  'hint',
  'message',
  'statusLabel',
  'sidebarTitle',
]

/** Imports no package may make. */
function importRules() {
  return {
    '@typescript-eslint/no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            group: ['lucide-react'],
            message: "Icons come from unitykit's Icon component.",
          },
        ],
      },
    ],
  }
}

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/coverage/**',
      '**/node_modules/**',
      // Git worktrees Claude Code makes for parallel work.
      '.claude/**',
      '**/generated/**',
      // The desktop shell's copy of the account build and its packaged output.
      'apps/desktop/web/**',
      'apps/desktop/release/**',
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: { ...globals.es2021 },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', destructuredArrayIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'no-restricted-syntax': ['error', ...NO_URLS],
      ...importRules(),
    },
  },

  {
    files: AGNOSTIC,
    rules: {
      'no-restricted-globals': ['error', ...DOM_GLOBALS],
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          ...importRules()['@typescript-eslint/no-restricted-imports'][1],
          paths: [
            {
              name: 'react-dom',
              message: 'React DOM is web-only. Shared packages run on React Native too.',
            },
            {
              name: 'react-native',
              message: 'Shared packages run on the web too. Put this in the mobile app.',
            },
          ],
          patterns: [
            ...importRules()['@typescript-eslint/no-restricted-imports'][1].patterns,
            {
              group: ['react-dom/*'],
              message: 'React DOM is web-only. Shared packages run on React Native too.',
            },
          ],
        },
      ],
    },
  },

  // The web UI: hooks used correctly, no literal user-facing strings, no colours.
  {
    files: UI,
    plugins: { 'react-hooks': reactHooks, i18next },
    languageOptions: {
      globals: { ...globals.browser },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'i18next/no-literal-string': [
        'error',
        {
          mode: 'jsx-only',
          'jsx-attributes': { include: USER_FACING_ATTRIBUTES, exclude: [] },
          message: 'User-facing text goes through the translation layer: t("key").',
        },
      ],
      'no-restricted-syntax': ['error', ...NO_URLS, ...NO_COLOURS],
    },
  },

  // The desktop shell's main process and its tools are Node, not a page. The
  // URL rule still applies: its one default host is in a config file.
  {
    files: ['apps/desktop/**/*.{ts,cts,mjs}', 'apps/*/tools/**/*.mjs'],
    languageOptions: { globals: { ...globals.node } },
  },
  // A sandboxed preload must be CommonJS, and CommonJS imports are `require`;
  // Metro and Babel read their configuration the same way.
  {
    files: ['apps/desktop/**/*.cts', 'apps/mobile/*.config.js', 'apps/mobile/plugins/**/*.js'],
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },

  // Tests, tools and configuration may name a host: a test needs an address to
  // connect to, and configuration is where a default belongs.
  {
    files: [
      '**/*.test.{ts,tsx,mjs}',
      '**/*.config.{ts,js,mjs}',
      // Expo config plugins are configuration too.
      'apps/mobile/plugins/**',
      'tools/**',
      'packages/*/scripts/**',
      'packages/*/src/corpus/**',
    ],
    languageOptions: { globals: { ...globals.node } },
    rules: { 'no-restricted-syntax': 'off' },
  },

  // Test fixtures render made-up pages; nobody reads their words.
  {
    files: ['**/*.test.{ts,tsx}', 'packages/ui-web/test/**'],
    rules: { 'i18next/no-literal-string': 'off' },
  },
)
