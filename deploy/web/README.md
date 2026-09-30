# Serving the web apps

Each web app is a container: its static build behind nginx, sending the
security headers from `headers.json` on every response (UO-43).

```sh
docker build --build-arg APP=account -f deploy/web.Dockerfile -t web-account .
docker run --rm -p 8080:8080 -e API_ORIGIN=https://api.example web-account
```

- `headers.json` is generated from `tools/app-config/headers.mjs`
  (`npm run generate:web-headers`) and checked by CI;
  `tools/app-config/generate-nginx-headers.mjs` turns it into nginx
  `add_header` lines at image build time.
- The default policy is strict: the page's own origin, the API, error
  tracking, uploaded images and the CAPTCHA widget; no camera, microphone or
  screen capture. A product that needs more declares it in
  `packages/product-config` under `webSecurity`: `origins` adds sources to a
  directive (`{ connect: ['wss://rt.example.com'] }`), `permissions` allows
  browser features on the app's own origin (`['camera', 'microphone']`).
  Regenerate the headers after changing it.
- The policy's placeholders (`__API_ORIGIN__`, `__ERROR_ORIGIN__`,
  `__STORAGE_ORIGIN__`) are filled at container start from `API_ORIGIN`,
  `ERROR_ORIGIN` and `STORAGE_ORIGIN`, which the deployment derives from the
  base hostname. Unset, a placeholder is dropped rather than served.
- Hashed assets are cached for a year; the page is never cached, so a deploy
  is seen on the next load. Every client-side route serves the index.
- `/healthz` answers for the load balancer. nginx runs as its own user on 8080.
- `VITE_RELEASE`, `VITE_SENTRY_DSN`, `VITE_RECAPTCHA_SITE_KEY` and
  `VITE_API_ORIGIN` are build arguments. Source maps go to Sentry when the
  build has `SENTRY_ORG` and `SENTRY_PROJECT` build arguments and a token as
  the secret `sentry_auth_token`
  (`--secret id=sentry_auth_token,env=SENTRY_AUTH_TOKEN`); without them
  nothing is uploaded.

## Optional: a per-page policy hook

Off by default. For a product whose policy differs by tenant (an org that
brings its own media provider, say), nginx can ask a service for extra
sources as it serves each page:

- `PAGE_POLICY_URL`: the endpoint to ask, with the key appended, such as
  `https://api.example/page-policy/`.
- `PAGE_POLICY_COOKIE`: the cookie holding the key (letters, digits and
  underscores). The app sets it once it knows the tenant.

With both set, nginx asks `PAGE_POLICY_URL` + the cookie's value and appends
the sources in the answer's `X-Csp-Connect`, `X-Csp-Script`, `X-Csp-Frame`,
`X-Csp-Media`, `X-Csp-Worker` and `X-Csp-Img` headers to those directives.
Nothing of the visitor's is forwarded. Each key's answer is cached for a
minute. With no cookie, a malformed one, or a hook that fails or takes over
two seconds, the page gets the base policy. With either variable unset
nothing is asked and the policy is exactly `headers.json`.
