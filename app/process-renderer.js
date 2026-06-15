window.onload = async (e) => {
  window.stretchly.onPlaySound((file, volume) => {
    __electronLog.info(`Stretchly: playing audio/${file}.wav (volume: ${volume})`)
    const audio = new Audio(`audio/${file}.wav`)
    audio.volume = volume
    audio.play()
  })
}
