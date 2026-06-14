#!/usr/bin/env bash
#
# Sourced by the signing scripts. Loads code-signing config from .env at the
# project root and validates the required variables.
#
# Must be sourced, not executed.
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  echo "load-signing-env.sh must be sourced, not executed." >&2
  exit 1
fi

_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
if [ -f "$_root/.env" ]; then
  set -o allexport
  # shellcheck disable=SC1091
  source "$_root/.env"
  set +o allexport
fi
unset _root

# Developer ID Application identity, referenced by name. The private key lives on
# a hardware token, so it does NOT show up in `security find-identity`; codesign
# still resolves it by this name. Required for signing.
: "${AppleCertName:?Set AppleCertName in .env (e.g. \"Developer ID Application: Company (TEAMID)\") — copy .env.example to .env}"

# notarytool keychain profile (created once with `xcrun notarytool store-credentials`).
# Only needed for notarization (sign-mac.sh --notarize); validated there, not here.
: "${NotarizationKeychainProfileName:=}"
