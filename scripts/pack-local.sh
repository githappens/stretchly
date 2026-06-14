#!/usr/bin/env bash
#
# Local, Santa-friendly packaging. Builds an unpacked .app for the host arch
# into build/dist/ — which is under the build/ allow-list (so the result runs)
# and already gitignored (the `dist` rule). Ensures node_modules is relocated
# under build/ first, so electron-builder's helper binaries are allowed to
# execute. Run inside the nix dev shell: `npm run pack:local`.
set -euo pipefail
cd "$(dirname "$0")/.."

bash scripts/relocate-node-modules.sh

if [ ! -x node_modules/.bin/electron-builder ]; then
  echo "electron-builder not found — run 'npm ci' in the nix dev shell first." >&2
  exit 1
fi

case "$(uname -m)" in
  arm64)  arch="--arm64" ;;
  x86_64) arch="--x64" ;;
  *)      arch="" ;;
esac

exec ./node_modules/.bin/electron-builder build --dir $arch -c.directories.output=build/dist
