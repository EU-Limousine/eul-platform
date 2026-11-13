#!/bin/sh
# Runs at container start (nginx entrypoint). Writes runtime config from env vars,
# so one image works in every environment. Never put secrets here — config.js is public.
set -eu

: "${API_URL:?API_URL must be set, e.g. https://api.eulimousine.com}"

cat > /usr/share/nginx/html/config.js <<EOF
window.__EUL_CONFIG__ = { apiUrl: "${API_URL}" };
EOF

API_HOST=$(echo "$API_URL" | sed -E 's#^https?://##; s#/.*$##')
sed -i "s#__API_ORIGIN__#${API_URL}#g; s#__API_HOST__#${API_HOST}#g" /etc/nginx/security-headers.conf
