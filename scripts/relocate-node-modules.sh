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
  # A symlink already. Drop it only if it points somewhere other than $target;
  # a correct link falls through to the file:-dep fix-up below.
  if [ "$(readlink node_modules)" != "$target" ]; then
    rm -f node_modules
  fi
elif [ -d node_modules ]; then
  # A real directory (e.g. npm ci just recreated it) — move it under build/.
  mkdir -p build
  rm -rf "$target"
  mv node_modules "$target"
fi

# Link node_modules -> $target when it is absent and there is a tree to point
# at; otherwise leave it for `npm ci` to create (which this relocates next run).
if [ ! -e node_modules ] && [ -d "$target" ]; then
  ln -s "$target" node_modules
  echo "node_modules -> $target (kept under the Santa-allowed build/ tree)"
fi

# Materialize file: dependencies as real directories. npm installs
# `file:native/strict-lock` as a symlink whose relative target
# (../native/strict-lock) is computed against the LOGICAL project-root
# node_modules. Once the real tree lives at build/node_modules that target
# dangles (build/native/strict-lock), so `require('strict-lock')` fails in dev
# and electron-builder packs the addon under /native/strict-lock instead of
# /node_modules/strict-lock — silently disabling the Cmd+Tab lockdown. A real
# copy resolves everywhere and packs at node_modules/strict-lock. The addon is
# N-API, so the prebuilt .node is portable. Idempotent: only fires while the
# entry is still npm's symlink.
if [ -L "$target/strict-lock" ]; then
  rm -f "$target/strict-lock"
  cp -R native/strict-lock "$target/strict-lock"
  echo "materialized file: dependency strict-lock as a real directory under $target"
fi
