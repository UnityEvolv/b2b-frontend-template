#!/bin/sh
# Fill the policy's deploy placeholders from the environment the container
# was started with: the API origin, derived from the base hostname by
# whoever deploys, the error tracker's ingest origin and the upload bucket.
# Runs before nginx starts.
set -eu
dir=/etc/nginx/app
template=$dir/headers.conf.template
out=$dir/headers.conf
api="${API_ORIGIN:-}"
errors="${ERROR_ORIGIN:-}"
# Where signed links to uploaded images point: the upload bucket.
storage="${STORAGE_ORIGIN:-}"

# A placeholder with no value is dropped rather than served.
sed -e "s| __API_ORIGIN__|${api:+ $api}|g" \
  -e "s| __ERROR_ORIGIN__|${errors:+ $errors}|g" \
  -e "s| __STORAGE_ORIGIN__|${storage:+ $storage}|g" \
  "$template" > "$out"

# Optional, and off unless both are set: a per-page policy hook. As nginx
# serves the page it asks PAGE_POLICY_URL, with the value of the cookie
# PAGE_POLICY_COOKIE names appended, and adds the sources the answer's
# X-Csp-Connect, X-Csp-Script, X-Csp-Frame, X-Csp-Media, X-Csp-Worker and
# X-Csp-Img headers name to those directives. For a policy that differs by
# tenant; see README.md.
hook_url="${PAGE_POLICY_URL:-}"
hook_cookie="${PAGE_POLICY_COOKIE:-}"
if [ -z "$hook_url" ] || [ -z "$hook_cookie" ]; then
  : > "$dir/page-policy.conf"
  : > "$dir/page-policy-ask.conf"
  exit 0
fi
case "$hook_cookie" in
  *[!A-Za-z0-9_]*)
    echo "PAGE_POLICY_COOKIE must be letters, digits and underscores" >&2
    exit 1
    ;;
esac

# Each directive the hook may add to gets the answer's sources, as an nginx
# variable; frame-src loses its 'none', since 'none' cannot sit beside an
# origin, and an empty frame-src allows nothing all the same.
sed -i -e "s|frame-src 'none'|frame-src|" \
  -e 's|\(connect-src [^;"]*\)|\1 $page_policy_connect|' \
  -e 's|\(script-src [^;"]*\)|\1 $page_policy_script|' \
  -e 's|\(frame-src[^;"]*\)|\1 $page_policy_frame|' \
  -e 's|\(media-src [^;"]*\)|\1 $page_policy_media|' \
  -e 's|\(worker-src [^;"]*\)|\1 $page_policy_worker|' \
  -e 's|\(img-src [^;"]*\)|\1 $page_policy_img|' \
  "$out"

# nginx looks the hook's host up itself, with the container's resolver.
resolver="$(awk '/^nameserver/ { print $2; exit }' /etc/resolv.conf 2>/dev/null || true)"
case "$resolver" in *:*) resolver="[$resolver]" ;; esac
cat > "$dir/page-policy.conf" <<EOF
resolver ${resolver:-127.0.0.11} valid=60s ipv6=off;

# Asked as each page is served. No key in the cookie, and any failure or
# slowness of the hook, is the base policy: never an error page, never a
# wait of more than two seconds.
location = /_page-policy {
  internal;
  if (\$cookie_${hook_cookie} !~ "^[A-Za-z0-9_-]{1,64}\$") {
    return 204;
  }
  # Nothing of the visitor's goes to the hook: no cookie, no header.
  proxy_pass_request_headers off;
  proxy_pass_request_body off;
  proxy_set_header Content-Length "";
  proxy_ssl_server_name on;
  proxy_connect_timeout 2s;
  proxy_send_timeout 2s;
  proxy_read_timeout 2s;
  # One try: a slow hook must not hold the page for every address it has.
  proxy_next_upstream off;
  proxy_cache page_policy;
  proxy_cache_key \$cookie_${hook_cookie};
  proxy_cache_valid 200 204 60s;
  proxy_cache_use_stale error timeout updating;
  proxy_ignore_headers Cache-Control Expires Set-Cookie;
  proxy_intercept_errors on;
  error_page 400 403 404 429 500 502 503 504 = @base-policy;
  proxy_pass ${hook_url}\$cookie_${hook_cookie};
}

location @base-policy {
  return 204;
}
EOF
cat > "$dir/page-policy-ask.conf" <<'EOF'
auth_request /_page-policy;
auth_request_set $page_policy_connect $upstream_http_x_csp_connect;
auth_request_set $page_policy_script $upstream_http_x_csp_script;
auth_request_set $page_policy_frame $upstream_http_x_csp_frame;
auth_request_set $page_policy_media $upstream_http_x_csp_media;
auth_request_set $page_policy_worker $upstream_http_x_csp_worker;
auth_request_set $page_policy_img $upstream_http_x_csp_img;
EOF
