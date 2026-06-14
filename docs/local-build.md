# Local builds (macOS)

This fork adds a reproducible Nix dev environment and a set of scripts for
building, signing, and installing Stretchly locally on macOS. None of this
changes how upstream releases are built; it is tooling for local development
and testing.

> If your machine restricts binary execution to an allow-list (e.g. Santa in
> lockdown mode), a couple of the steps below exist specifically to keep build
> and app binaries inside an allowed path. They are harmless on an unrestricted
> machine. Those points are called out as **Why build/?** notes.

## Contents

- [Dev environment (Nix)](#dev-environment-nix)
- [Install dependencies](#install-dependencies)
- [Dev build](#dev-build)
- [Run in development mode](#run-in-development-mode)
- [Code signing](#code-signing)
- [Deploy to /Applications](#deploy-to-applications)
- [Notarization (optional)](#notarization-optional)
- [Script reference](#script-reference)

## Dev environment (Nix)

The toolchain is pinned with a Nix flake so it does not depend on whatever
`node` happens to be on your `PATH`. The flake provides Node `24.15.0` (matching
`.nvmrc`), `python3` (for the native module builds), and `git`.

Enter the dev shell:

```bash
nix develop
```

or, if you use [direnv](https://direnv.net/), allow the checked-in `.envrc`
(`use flake`) once and the shell activates automatically:

```bash
direnv allow
```

You need Nix with flakes enabled. Everything below assumes you are inside the
dev shell.

**Why build/?** On entry the shell runs `scripts/relocate-node-modules.sh`,
which keeps the real `node_modules` tree under `build/node_modules` and leaves
`node_modules` as a symlink to it. `node_modules` ships executables (Electron
itself, electron-builder's helpers, native `.node` addons), and on an
execution-restricted machine those must live under an allowed path to run. The
relocation is idempotent and self-healing: `npm ci` recreates a real directory,
and the next shell entry (or build) moves it back.

## Install dependencies

```bash
npm ci
```

Native modules are rebuilt for Electron automatically via the `postinstall`
hook.

## Dev build

Build an unpacked, unsigned `.app` for your host architecture:

```bash
npm run pack:local
```

Output: `build/dist/<arch>/Stretchly.app` (e.g. `build/dist/mac-arm64/`). Launch
it directly:

```bash
open build/dist/*/Stretchly.app
```

Stretchly is a menu-bar app, so it appears in the tray rather than the Dock.

**Why build/?** `pack:local` points electron-builder's output at `build/dist`
(via `-c.directories.output`) instead of the default `dist/`. `build/dist` is
under the `build/` tree (an allowed execution path) and is already gitignored.
The stock `npm run pack` / `npm run dist` scripts still write to `dist/` and are
left untouched for parity with upstream.

## Run in development mode

The upstream dev workflow still applies:

```bash
npm run dev
```

This enables remote debugging on `http://localhost:9222`.

## Code signing

Signing is only relevant for installing into `/Applications` (see below) or
distributing the app. Configure it once by copying the template and filling in
your values:

```bash
cp .env.example .env
```

`.env` (gitignored) holds:

```bash
AppleCertName="Developer ID Application: Your Company (TEAMID)"
NotarizationKeychainProfileName=notarytool-profile   # only needed for --notarize
```

Sign the most recent build:

```bash
npm run sign:mac
```

This signs every Mach-O binary and nested bundle in the app with your Developer
ID, using a hardened runtime and the entitlements in
`scripts/entitlements.mac.plist`.

### Hardware-token note (one PIN)

If your signing key is on a hardware token (e.g. a YubiKey), it may not appear
in `security find-identity` — the script references the certificate by name, so
that is fine. More importantly, `codesign` authenticates to the token **once per
process**. To avoid a PIN prompt per file, `sign:mac` collects every binary and
bundle and signs them all in a **single** `codesign` invocation (deepest path
first). You should be prompted for the PIN once.

`codesign --deep` is not used because it does not traverse the loose dylibs in
the Electron Framework's `Libraries/` directory or the native `.node` addons in
`app.asar.unpacked`, which leaves them ad-hoc signed and breaks notarization.

## Deploy to /Applications

Build, sign, and install into `/Applications` in one step:

```bash
npm run deploy
```

`/Applications` requires `sudo` to write, so run this from an admin shell; the
install step elevates with `sudo` only if the directory is not writable. A
running instance is quit first so it can be replaced.

Flags:

```bash
npm run deploy -- --no-build    # sign + install whatever is already built
npm run deploy -- --notarize    # also notarize + staple before installing
```

**Why sign for /Applications?** An unsigned dev build only runs from the
`build/` tree on an execution-restricted machine. Signing with a Developer ID
lets the app run from anywhere it is allowed by its team rule, including
`/Applications`. Notarization is **not** required for this — the local execution
check reads the signature, not a notarization ticket.

## Notarization (optional)

Notarization matters only for Gatekeeper on other machines / downloaded copies,
not for running locally. It is opt-in:

```bash
npm run sign:mac -- --notarize
npm run deploy -- --notarize
```

This zips the signed app, submits it with `xcrun notarytool` using the keychain
profile from `.env`, waits for the result, and staples the ticket onto the
bundle. Create the keychain profile once with:

```bash
xcrun notarytool store-credentials notarytool-profile \
  --apple-id you@example.com --team-id TEAMID
```

## Script reference

| Command | What it does |
| --- | --- |
| `nix develop` | Enter the pinned dev shell (Node 24.15.0, python3, git). |
| `npm ci` | Install dependencies and rebuild native modules. |
| `npm run pack:local` | Unsigned dev build into `build/dist/<arch>/Stretchly.app`. |
| `npm run dev` | Run with remote debugging on `:9222`. |
| `npm run sign:mac` | Sign the built app with your Developer ID (add `-- --notarize`). |
| `npm run deploy` | Build, sign, install into `/Applications` (add `-- --no-build` / `-- --notarize`). |
| `npm test` | Run the test suite. |
| `npm run lint` | Run `standard`. |

Supporting scripts live in `scripts/`:

| Script | Purpose |
| --- | --- |
| `relocate-node-modules.sh` | Keep `node_modules` under `build/` (run automatically by the dev shell). |
| `pack-local.sh` | The `pack:local` build. |
| `sign-mac.sh` | Sign (and optionally notarize + staple) a built app. |
| `deploy-local.sh` | The `deploy` flow. |
| `load-signing-env.sh` | Load signing config from `.env`. |
| `entitlements.mac.plist` | Electron hardened-runtime entitlements used when signing. |
