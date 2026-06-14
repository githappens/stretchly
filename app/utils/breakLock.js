// Cmd+Tab lockdown during breaks (macOS only).
//
// Wraps the native `strict-lock` event-tap addon. While a break is showing the
// app swallows Cmd+Tab so the user cannot switch away or drop a fullscreen
// break out of its Space. The tap needs Accessibility permission; when it is
// missing we prompt once and log loudly rather than silently failing open.

import { createRequire } from 'module'
import { systemPreferences } from 'electron'
import log from 'electron-log/main.js'

const require = createRequire(import.meta.url)

let native = null
if (process.platform === 'darwin') {
  try {
    native = require('strict-lock')
  } catch (err) {
    log.error(`Stretchly: failed to load strict-lock native module, Cmd+Tab lockdown unavailable: ${err}`)
  }
}

// Engage the lockdown for an active break. Returns true only when the tap is
// actually swallowing keys. Returns false (and logs) on non-macOS, a missing
// module, or when Accessibility permission has not been granted.
export function engageBreakLock () {
  if (!native) return false

  if (!native.isInstalled()) {
    const installed = native.install()
    if (!installed) {
      // Not trusted for Accessibility — prompt so the user can grant it. The
      // lockdown only takes effect on the next break after granting.
      systemPreferences.isTrustedAccessibilityClient(true)
      log.error('Stretchly: Cmd+Tab lockdown could not engage — grant Accessibility permission in System Settings > Privacy & Security > Accessibility')
      return false
    }
    log.info('Stretchly: Cmd+Tab lockdown installed')
  }

  native.setActive(true)
  return true
}

// Release the lockdown when a break ends. Safe to call unconditionally.
export function releaseBreakLock () {
  if (!native) return
  native.setActive(false)
}
