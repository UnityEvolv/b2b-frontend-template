# syntax=docker/dockerfile:1
# A web app as a container: the static build behind nginx, with the
# security headers from deploy/web/headers.json (UO-43). Build context is
# the repository root; APP is account, admin or platform.
#
#   docker build --build-arg APP=account -f deploy/web.Dockerfile -t web-account .

FROM node:22-alpine AS build
ARG APP
ARG VITE_RELEASE=
ARG VITE_SENTRY_DSN=
ARG VITE_RECAPTCHA_SITE_KEY=
ARG VITE_API_ORIGIN=
ARG VITE_REALTIME_ORIGIN=
# The admin app, for links from a failed call to a provider's setup guide (UO-152).
ARG VITE_ADMIN_ORIGIN=
WORKDIR /src
COPY package.json package-lock.json tsconfig.base.json ./
COPY apps ./apps
COPY packages ./packages
COPY tools ./tools
COPY deploy/web/headers.json ./deploy/web/headers.json
RUN npm ci --no-audit --no-fund
RUN test -n "${APP}" \
  && VITE_RELEASE="${VITE_RELEASE}" VITE_SENTRY_DSN="${VITE_SENTRY_DSN}" VITE_RECAPTCHA_SITE_KEY="${VITE_RECAPTCHA_SITE_KEY}" VITE_API_ORIGIN="${VITE_API_ORIGIN}" VITE_REALTIME_ORIGIN="${VITE_REALTIME_ORIGIN}" VITE_ADMIN_ORIGIN="${VITE_ADMIN_ORIGIN}" \
     npm run build -w "@b2b-template/app-${APP}" \
  && node tools/app-config/generate-nginx-headers.mjs > /src/headers.conf

FROM nginx:1.27-alpine
ARG APP
COPY deploy/web/nginx.conf /etc/nginx/nginx.conf
COPY deploy/web/entrypoint.sh /docker-entrypoint.d/40-unityofis-headers.sh
COPY --from=build /src/headers.conf /etc/nginx/unityofis/headers.conf.template
COPY --from=build /src/apps/${APP}/dist /usr/share/nginx/html
RUN chmod +x /docker-entrypoint.d/40-unityofis-headers.sh \
  && mkdir -p /etc/nginx/unityofis && chown -R nginx:nginx /etc/nginx/unityofis /var/cache/nginx /var/run
USER nginx
EXPOSE 8080
