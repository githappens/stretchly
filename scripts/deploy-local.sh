#!/usr/bin/env bash
#
# Full local deploy: build (unsigned, into build/), sign, then install into
# /Applications. Signing with the Developer ID gets the app past Santa lockdown
# in /Applications (allowed via its TeamID rule), which the unsigned build/ app
# can't do outside the build/ allow-list. Notarization is NOT needed for local
# use and is skipped by default; pass --notarize for a Gatekeeper-clean build.
#
# /Applications needs sudo — run from an admin shell; the install step uses sudo
# automatically if the directory isn't writable.
#
# Flags (inside the nix dev shell):
#   npm run deploy                  build, sign, install
#   npm run deploy -- --no-build    deploy whatever is already built
#   npm run deploy -- --notarize    also notarize + staple before installing
set -euo pipefail
cd "$(dirname "$0")/.."

APP_NAME="Stretchly.app"
DEST="/Applications/$APP_NAME"

build=true
sign_args=()
for arg in "$@"; do
  case "$arg" in
    --no-build) build=false ;;
    --notarize) sign_args+=(--notarize) ;;
    *) echo "Unknown option: $arg" >&2; exit 1 ;;
  esac
done

# 1. Build the unsigned dev build into build/dist (unless reusing an existing one).
if [ "$build" = true ]; then
  bash scripts/pack-local.sh
fi

APP="$(ls -d build/dist/*/Stretchly.app 2>/dev/null | head -1)"
if [ -z "${APP:-}" ] || [ ! -d "$APP" ]; then
  echo "No app bundle found — run a build first (drop --no-build)." >&2
  exit 1
fi

# 2. Sign (and optionally notarize + staple).
bash scripts/sign-mac.sh "${sign_args[@]}" "$APP"

# 3. Quit a running instance so we can replace it.
osascript -e 'quit app "Stretchly"' 2>/dev/null || true
pkill -f "/Applications/$APP_NAME/Contents/MacOS/Stretchly" 2>/dev/null || true
sleep 1

# 4. Install into /Applications (sudo only if the directory isn't writable).
sudo_cmd=""
[ -w /Applications ] || sudo_cmd="sudo"
echo "==> Installing to $DEST ${sudo_cmd:+(via sudo)}"
$sudo_cmd rm -rf "$DEST"
$sudo_cmd cp -R "$APP" "$DEST"

echo "Deployed: $DEST"
echo "Launch with: open \"$DEST\""
