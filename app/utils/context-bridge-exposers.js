import semver from 'semver'
import humanizeDuration from 'humanize-duration'
import { contextBridge, ipcRenderer, shell } from 'electron'
import * as utils from './utils.js'
import sanitizeIdea from './sanitizeIdea.js'

function exposeElectronApi () {
  contextBridge.exposeInMainWorld('electronApi', {
    openExternal: (path) => shell.openExternal(path),
    openPath: (path) => shell.openPath(path),
    resolveLocalImage: (filename) => ipcRenderer.invoke('resolve-local-image', filename)
  })
}

function exposeI18next () {
  contextBridge.exposeInMainWorld('i18next', {
    t: (key, options) => ipcRenderer.invoke('i18next-translate', key, options),
    dir: () => ipcRenderer.invoke('i18next-dir')
  })
}

function exposeBreaks (type) {
  contextBridge.exposeInMainWorld('breaks', {
    sendBreakData: () => ipcRenderer.invoke(`send-${type}-break-data`),
    finishBreak: (manualAwaiting) => ipcRenderer.send(`finish-${type}-break`, false, manualAwaiting),
    postponeBreak: () => ipcRenderer.send(`postpone-${type}-break`),
    signalLoaded: () => ipcRenderer.send(`${type}-break-loaded`),
    onEnterManualAwait: (callback) => ipcRenderer.on('enter-manual-await', (_e, which) => callback(which)),
    sanitizeIdea: (value) => sanitizeIdea(value)
  })
}

function exposeRuntime () {
  contextBridge.exposeInMainWorld('runtime', {
    platform: () => process.platform,
    node: () => process.versions.node,
    chrome: () => process.versions.chrome,
    electron: () => process.versions.electron,
    getSystemVersion: () => process.getSystemVersion()
  })
}

function exposeSettings () {
  contextBridge.exposeInMainWorld('settings', {
    get: (key) => ipcRenderer.invoke('settings-get', key),
    currentSettings: async () => {
      return await ipcRenderer.invoke('current-settings')
    },
    saveSettings: async (key, value) => {
      ipcRenderer.send('save-setting', key, value)
    }
  })
}

function exposeStretchly () {
  contextBridge.exposeInMainWorld('stretchly', {
    onTranslate: (callback) => ipcRenderer.on('translate',
      () => callback()),
    onPlaySound: (callback) => ipcRenderer.on('play-sound',
      (_event, file, volume) => callback(file, volume)),
    onShowNotification: (callback) => ipcRenderer.on('show-notification',
      (_event, text, silent) => callback(text, silent)),
    getWindowBounds: () => ipcRenderer.invoke('get-window-bounds'),
    getVersion: () => ipcRenderer.invoke('get-version'),
    setWindowSize: (width, height) => ipcRenderer.send('set-window-size', width, height),
    restoreDefaults: () => ipcRenderer.send('restore-defaults'),
    closeWindow: () => ipcRenderer.send('close-current-window'),
    openPreferences: () => ipcRenderer.send('open-preferences'),
    playSound: (name) => ipcRenderer.send('play-sound', name),
    showDebug: () => ipcRenderer.invoke('show-debug')
  })
}

function exposeUtils () {
  const i18n = {
    t: (key, options) => ipcRenderer.invoke('i18next-translate', key, options)
  }
  contextBridge.exposeInMainWorld('utils', {
    formatKeyboardShortcut: utils.formatKeyboardShortcut,
    formatTimeRemaining: async (milliseconds, locale) => {
      return utils.formatTimeRemaining(milliseconds, locale, i18n, humanizeDuration)
    },
    formatElapsedDuration: async (milliseconds, locale) => {
      return utils.formatElapsedDuration(milliseconds, locale, i18n, humanizeDuration)
    },
    formatUnitAndValue: (unit, value) => {
      return utils.formatUnitAndValue(unit, value, i18n)
    },
    shouldShowNotificationTitle: (platform, systemVersion) => {
      return utils.shouldShowNotificationTitle(platform, systemVersion, semver)
    },
    canPostpone: utils.canPostpone,
    canSkip: utils.canSkip
  })
}

export {
  exposeElectronApi,
  exposeI18next,
  exposeBreaks,
  exposeSettings,
  exposeStretchly,
  exposeRuntime,
  exposeUtils
}
