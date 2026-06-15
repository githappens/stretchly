window.onload = async (e) => {
  window.stretchly.onPlaySound((file, volume) => {
    __electronLog.info(`Stretchly: playing audio/${file}.wav (volume: ${volume})`)
    const audio = new Audio(`audio/${file}.wav`)
    audio.volume = volume
    audio.play()
  })

  window.stretchly.onShowNotification(async (text, silent) => {
    __electronLog.info(`Stretchly: showing notification "${text}" (silent: ${silent})`)
    const title = await window.utils.shouldShowNotificationTitle(
      await window.runtime.platform(),
      await window.runtime.getSystemVersion()
    )
      ? 'Stretchly'
      : ''
    const notification = new Notification(title, {
      body: text,
      requireInteraction: true,
      silent,
      icon: '../build/icon.ico'
    })
    setTimeout(() => notification.close(), 7000)
  })
}
