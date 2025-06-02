#!/usr/bin/env sh
set -e

DEFAULT_CONF="/etc/nginx/conf.d/default.conf"

if [ -z "${BACKEND_URL:-}" ]; then
  echo "⚠️  BACKEND_URL is not set. The placeholder __BACKEND_URL__ will remain unchanged."
else
  echo "🔧 Injecting BACKEND_URL=${BACKEND_URL} into ${DEFAULT_CONF}"
  sed -i "s|__BACKEND_URL__|${BACKEND_URL}|g" "$DEFAULT_CONF"
fi

echo "🚀 Starting nginx..."
nginx -g "daemon off;"
