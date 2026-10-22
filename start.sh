#!/usr/bin/env bash
# Starts the local demo: SDK build, backend (:4100, in-memory), admin (:5173)
# and a static demo storefront (:4200).
set -euo pipefail
cd "$(dirname "$0")"

[ -f backend/.env ] || cp backend/.env.example backend/.env
[ -f admin/.env.local ] || cp admin/.env.example admin/.env.local

pnpm install --frozen-lockfile
pnpm build:sdk

trap 'kill 0' EXIT INT TERM
pnpm dev:backend &
pnpm dev:admin &
python3 -m http.server 4200 --directory demo --bind 127.0.0.1 >/dev/null 2>&1 &
echo
echo "Backend   http://localhost:4100"
echo "Admin     http://localhost:5173   (admin key: ADMIN_API_KEY in backend/.env)"
echo "Demo shop http://localhost:4200"
wait
