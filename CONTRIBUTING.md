# Contributing

Thank you for helping. This file covers how to propose a change.

## Before you start

- For anything bigger than a small fix, open an issue first so the approach can
  be agreed before you write code.
- Security problems are reported privately. See [SECURITY.md](SECURITY.md).
- Everyone taking part follows the [code of conduct](CODE_OF_CONDUCT.md).

## Making a change

1. Fork the repository and create a branch from `main`.
2. Keep the pull request small and focused on one thing.
3. Put tests beside the code they test.
4. Use [conventional commit](https://www.conventionalcommits.org/) messages, for
   example `feat(admin): ...` or `fix(ui-web): ...`.
5. Run the full check before opening the pull request:

   ```sh
   npm ci
   npm run check
   ```

   This covers type checking, lint, tests, the build, and the build guards. The
   API clients are generated from the backend's OpenAPI specs; never edit them
   by hand.

## What every change must get right

- User-facing text goes through i18n. Lint rejects string literals in the UI.
- Colours and spacing come from the design system, not hard-coded values.
- No hostnames or product URLs in code; they come from configuration.
- Anything the UI disables must also be refused by the API. Hiding a button is
  never the only check.

## Licence

By contributing you agree that your contribution is licensed under the
[MIT licence](LICENSE).
