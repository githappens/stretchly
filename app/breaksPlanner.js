import Scheduler from './utils/scheduler.js'
import EventEmitter from 'events'

class BreaksPlanner extends EventEmitter {
  constructor (settings) {
    super()
    this.settings = settings
    // Inert in CLI-only mode (no rotation / postpone), but still read by the
    // show-debug IPC handler in main.js, so they are kept as zeroed fields.
    this.breakNumber = 0
    this.postponesNumber = 0
    this.scheduler = null

    this.on('microbreakStarted', (shouldPlaySound) => {
      const interval = this.settings.get('microbreakDuration')
      this.scheduler = new Scheduler(() => this.emit('finishMicrobreak', shouldPlaySound, true), interval, 'finishMicrobreak')
      this.scheduler.plan()
    })

    this.on('breakStarted', (shouldPlaySound) => {
      const interval = this.settings.get('breakDuration')
      this.scheduler = new Scheduler(() => this.emit('finishBreak', shouldPlaySound, true), interval, 'finishBreak')
      this.scheduler.plan()
    })
  }

  nextBreak () {
    if (this.scheduler) this.scheduler.cancel()
    // CLI-only: nothing is scheduled automatically. An idle scheduler
    // (never planned, reference null) keeps every scheduler consumer safe.
    this.scheduler = new Scheduler(null, 0, null)
  }

  skipToMicrobreak (delay = 100) {
    if (this.scheduler) this.scheduler.cancel()
    this.scheduler = new Scheduler(() => this.emit('startMicrobreak'), delay, 'startMicrobreak')
    this.scheduler.plan()
  }

  skipToBreak (delay = 100) {
    if (this.scheduler) this.scheduler.cancel()
    this.scheduler = new Scheduler(() => this.emit('startBreak'), delay, 'startBreak')
    this.scheduler.plan()
  }

  clear () {
    this.scheduler.cancel()
    this.breakNumber = 0
    this.postponesNumber = 0
  }
}

export default BreaksPlanner
