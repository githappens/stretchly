#!/usr/bin/env bash
#
# Keep node_modules physically under build/ and expose it via a symlink.
#
# Why: this machine runs Santa in lockdown mode, which only allows binaries to
# execute from an allow-list of paths (one of which is <project>/build/...).
# node_modules ships prebuilt binaries that get executed during dev and
# packaging — electron itself, plus electron-builder's helpers (app-builder,
# 7za, ...). Left in <project>/node_modules they sit outside the allow-list and
# Santa kills them (ERR_ELECTRON_BUILDER_CANNOT_EXECUTE, exit code null).
#
# Santa resolves symlinks to their real path, so we keep the real tree at
# build/node_modules (allow-listed) and make node_modules a symlink to it.
#
# This script is idempotent and self-healing: npm ci / npm install replace the
# symlink with a fresh real directory, and re-running this puts it back. It is
# invoked from the flake shellHook (every dev-shell entry) and from
# scripts/pack-local.sh (before packaging).
set -euo pipefail
cd "$(dirname "$0")/.."

target="build/node_modules"

if [ -L node_modules ]; then
  # Already the symlink we want — nothing to do.
  [ "$(readlink node_modules)" = "$target" ] && exit 0
  # Wrong or broken symlink — drop it.
  rm -f node_modules
elif [ -d node_modules ]; then
  # A real directory (e.g. npm ci just recreated it) — move it under build/.
  mkdir -p build
  rm -rf "$target"
  mv node_modules "$target"
fi

# node_modules is now absent. Link it only if there is a tree to point at;
# otherwise leave it for `npm ci` to create (which this will relocate next run).
if [ -d "$target" ]; then
  ln -s "$target" node_modules
  echo "node_modules -> $target (kept under the Santa-allowed build/ tree)"
fi
