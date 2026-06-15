function formatTimeRemaining (milliseconds, locale, i18next, humanizeDuration) {
  if (locale === 'pt-BR') {
    locale = 'pt'
  }
  return i18next.t('utils.remaining', {
    count: humanizeDuration(milliseconds,
      { round: true, delimiter: ' ', language: locale.replace('-', '_'), fallbacks: ['en'] })
  })
}

function formatElapsedDuration (milliseconds, locale, i18next, humanizeDuration) {
  if (locale === 'pt-BR') {
    locale = 'pt'
  }
  return i18next.t('utils.elapsed', {
    count: humanizeDuration(milliseconds,
      { round: true, delimiter: ' ', language: locale.replace('-', '_'), fallbacks: ['en'] })
  })
}

function formatTimeIn (milliseconds, locale, i18next, humanizeDuration) {
  if (locale === 'pt-BR') {
    locale = 'pt'
  }
  return i18next.t('utils.inAbout', {
    count: humanizeDuration(milliseconds,
      { round: true, delimiter: ' ', language: locale.replace('-', '_'), fallbacks: ['en'], units: ['d', 'h', 'm'] })
  })
}

function formatUnitAndValue (unit, value, i18next) {
  if (unit === 'seconds') {
    if (value < 60) {
      return i18next.t('utils.seconds', { count: parseInt(value) })
    } else {
      const val = parseFloat((value / 60).toFixed(1))
      if (val % 1 === 0) {
        return i18next.t('utils.minutes', { count: parseInt(val) })
      } else {
        return i18next.t('utils.minutes', { count: parseFloat(val) })
      }
    }
  } else {
    return i18next.t(`utils.${unit}`, { count: parseInt(value) })
  }
}

function formatKeyboardShortcut (keyboardShortcut) {
  return keyboardShortcut.replace('Or', '/').replace('+', ' + ')
}

function minutesRemaining (milliseconds) {
  return Math.round(milliseconds / 60000.0)
}

export {
  formatTimeRemaining,
  formatElapsedDuration,
  formatTimeIn,
  formatUnitAndValue,
  formatKeyboardShortcut,
  minutesRemaining
}
