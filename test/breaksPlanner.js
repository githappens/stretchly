import 'chai/register-should'
import { join } from 'path'
import { unlink } from 'node:fs'
import Store from 'electron-store'
import BreaksPlanner from '../app/breaksPlanner'
import defaultSettings from '../app/utils/defaultSettings'

const settingsName = 'test-settings-breaksPlanner'

describe('breaksPlanner', function () {
  let settings = null
  let planner = null

  beforeEach(() => {
    settings = new Store({
      cwd: join(__dirname),
      name: settingsName,
      defaults: defaultSettings
    })
  })

  afterEach(() => {
    if (planner && planner.scheduler) planner.scheduler.cancel()
    planner = null
    unlink(join(__dirname, `${settingsName}.json`), () => {})
  })

  describe('with both break types disabled (manual-only mode)', function () {
    beforeEach(() => {
      settings.set('microbreak', false)
      settings.set('break', false)
      planner = new BreaksPlanner(settings)
    })

    it('does not throw and leaves an idle scheduler after nextBreak()', () => {
      planner.nextBreak()
      planner.scheduler.should.not.equal(null)
      ;(planner.scheduler.reference === null).should.equal(true)
      planner.scheduler.timeLeft.should.equal(false)
    })

    it('schedules no automatic break', () =>
      new Promise((resolve, reject) => {
        planner.on('startMicrobreak', () => reject(new Error('startMicrobreak fired')))
        planner.on('startBreak', () => reject(new Error('startBreak fired')))
        planner.nextBreak()
        setTimeout(resolve, 300)
      }))

    it('still triggers a Mini break on demand via skipToMicrobreak()', () =>
      new Promise((resolve) => {
        planner.nextBreak()
        planner.on('startMicrobreak', () => resolve())
        planner.skipToMicrobreak(50)
      }))

    it('still triggers a Long break on demand via skipToBreak()', () =>
      new Promise((resolve) => {
        planner.nextBreak()
        planner.on('startBreak', () => resolve())
        planner.skipToBreak(50)
      }))

    it('returns to idle after a manually triggered break finishes', () => {
      planner.nextBreak()
      // simulate the break starting and finishing, which re-plans via nextBreak()
      planner.skipToMicrobreak(50)
      planner.nextBreak()
      ;(planner.scheduler.reference === null).should.equal(true)
      planner.scheduler.timeLeft.should.equal(false)
    })
  })

  describe('with at least one break type enabled (regression)', function () {
    afterEach(() => {
      if (planner && planner.scheduler) planner.scheduler.cancel()
    })

    it('schedules a microbreak when only microbreaks are enabled', () => {
      settings.set('microbreak', true)
      settings.set('break', false)
      settings.set('microbreakNotification', false)
      planner = new BreaksPlanner(settings)
      planner.nextBreak()
      planner.scheduler.reference.should.equal('startMicrobreak')
    })

    it('schedules a break when only long breaks are enabled', () => {
      settings.set('microbreak', false)
      settings.set('break', true)
      settings.set('breakNotification', false)
      planner = new BreaksPlanner(settings)
      planner.nextBreak()
      planner.scheduler.reference.should.equal('startBreak')
    })
  })

  describe('BreaksPlanner (no managers, no pause)', function () {
    it('does not construct natural/dnd/exclusion managers', () => {
      planner = new BreaksPlanner(settings)
      ;(planner.naturalBreaksManager === undefined).should.equal(true)
      ;(planner.dndManager === undefined).should.equal(true)
      ;(planner.appExclusionsManager === undefined).should.equal(true)
    })

    it('no longer exposes pause/resume', () => {
      planner = new BreaksPlanner(settings)
      ;(planner.pause === undefined).should.equal(true)
      ;(planner.resume === undefined).should.equal(true)
      ;(planner.isPaused === undefined).should.equal(true)
    })

    it('skipToMicrobreak schedules a startMicrobreak', () => {
      planner = new BreaksPlanner(settings)
      planner.nextBreak()
      planner.skipToMicrobreak()
      planner.scheduler.reference.should.equal('startMicrobreak')
    })
  })
})
