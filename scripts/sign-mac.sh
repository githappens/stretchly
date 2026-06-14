#!/usr/bin/env bash
#
# Sign + notarize + staple a built Stretchly.app for distribution.
#
# The Developer ID Application cert lives on a hardware token (YubiKey), so it
# does not appear in `security find-identity`, and codesign authenticates to the
# token once per process. Two naive approaches both fail here:
#   * @electron/osx-sign calls codesign once per nested file (hundreds, for
#     Electron) -> a PIN prompt per file + errSecInternalComponent under rapid
#     token access.
#   * `codesign --deep` is one process (one PIN) but does NOT traverse the loose
#     dylibs in the Electron Framework's Libraries/ dir or the native .node
#     addons in app.asar.unpacked, leaving them ad-hoc signed -> notarization
#     rejects them ("not signed with a valid Developer ID / no secure timestamp").
#
# So we enumerate every Mach-O binary and every nested bundle and sign them ALL
# in a SINGLE codesign invocation, deepest path first (containers after their
# contents). One process = one token auth = one PIN, and nothing is missed. The
# cert is referenced by NAME (no find-identity preflight needed).
#
# Signing alone is enough to run locally on a Santa-lockdown machine (the app is
# allowed via its Developer ID TeamID rule). Notarization is only needed for
# Gatekeeper on other machines / downloaded copies, so it is opt-in via
# --notarize (uses notarytool + a keychain profile, then staples the ticket).
#
# Usage (inside the nix dev shell): `npm run sign:mac [-- --notarize] [app-path]`
set -euo pipefail
cd "$(dirname "$0")/.."
# shellcheck source=scripts/load-signing-env.sh
source scripts/load-signing-env.sh

NOTARIZE=false
APP=""
for arg in "$@"; do
  case "$arg" in
    --notarize) NOTARIZE=true ;;
    *) APP="$arg" ;;
  esac
done
APP="${APP:-$(ls -d build/dist/*/Stretchly.app 2>/dev/null | head -1)}"
if [ -z "${APP:-}" ] || [ ! -d "$APP" ]; then
  echo "No app bundle found — build it first: npm run pack:local" >&2
  exit 1
fi

echo "==> Code signing all nested binaries + bundles in one pass as: $AppleCertName"
echo "    Enter the YubiKey PIN ONCE when prompted."

# Inside-out order: every Mach-O file and every nested bundle (.app/.framework)
# plus the app itself, sorted by path depth descending so contents are signed
# before the container that seals them.
mapfile -t SIGN_PATHS < <(
  {
    find "$APP" -type f -exec sh -c 'file -b "$1" | grep -q "Mach-O" && printf "%s\n" "$1"' _ {} \;
    find "$APP" -type d \( -name '*.app' -o -name '*.framework' \)
    printf "%s\n" "$APP"
  } | awk -F/ '{print NF"\t"$0}' | sort -rn -k1,1 | cut -f2-
)

codesign --force --timestamp --options runtime \
  --entitlements scripts/entitlements.mac.plist \
  --sign "$AppleCertName" \
  "${SIGN_PATHS[@]}"

echo "==> Verifying signature"
codesign --verify --deep --strict --verbose=2 "$APP"

if [ "$NOTARIZE" != true ]; then
  echo "Signed: $APP"
  echo "(Signing is enough to run locally under Santa. Pass --notarize for a distributable, Gatekeeper-clean build.)"
  exit 0
fi

: "${NotarizationKeychainProfileName:?--notarize needs NotarizationKeychainProfileName set in .env}"

echo "==> Notarizing (uploads to Apple, can take a few minutes)"
zip="build/dist/$(basename "${APP%.app}")-notarize.zip"
rm -f "$zip"
# ditto preserves the signature/symlinks correctly for .app notarization.
ditto -c -k --sequesterRsrc --keepParent "$APP" "$zip"
xcrun notarytool submit "$zip" \
  --keychain-profile "$NotarizationKeychainProfileName" \
  --wait
rm -f "$zip"

echo "==> Stapling notarization ticket"
xcrun stapler staple "$APP"
xcrun stapler validate "$APP"
spctl --assess -vv --type execute "$APP"

echo "Signed, notarized, stapled: $APP"
