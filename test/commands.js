import 'chai/register-should'
import { expect } from 'vitest'
import Command from '../app/utils/commands'

describe('commands', () => {
  it('should parse a valid simple command', () => {
    const input = ['help']
    const cmd = new Command(input, '1.2.3')
    cmd.command.should.be.equal('help')
  })

  it('should drop all flags before the command', () => {
    const input = ['--some-electron-flag=value', 'mini', '-T', 'test']
    const cmd = new Command(input, '1.2.3')
    cmd.command.should.be.equal('mini')
    cmd.options.title.should.be.equal('test')
  })

  it('should get options from a command', () => {
    const cmd = new Command(['long', '-T', 'test', '-t', 'body'], '1.2.3')
    cmd.options.title.should.be.equal('test')
    cmd.options.text.should.be.equal('body')
  })

  it('includes only the specified options in the resulting options object', () => {
    const cmd = new Command(['mini', '-T', 'test'], '1.2.3')
    cmd.options.should.deep.equal({ title: 'test' })
  })

  it('hasSupportedCommand is false with an invalid command', () => {
    const cmd = new Command(['foo'], '1.2.3')
    cmd.hasSupportedCommand.should.be.equal(false)
  })

  it('hasSupportedCommand is true with an invalid command', () => {
    const cmd = new Command(['mini'], '1.2.3')
    cmd.hasSupportedCommand.should.be.equal(true)
  })
})

describe('CLI surface (process-per-break)', () => {
  it('defaults to preferences when no command is given', () => {
    const cmd = new Command([], '1.0.0')
    expect(cmd.command).toBe('preferences')
    expect(cmd.hasSupportedCommand).toBe(true)
  })

  it('supports mini with only --title', () => {
    const cmd = new Command(['mini', '-T', 'Stretch up!'], '1.0.0')
    expect(cmd.hasSupportedCommand).toBe(true)
    expect(cmd.options.title).toBe('Stretch up!')
  })

  it('supports long with --title and --text', () => {
    const cmd = new Command(['long', '-T', 'Title', '-t', 'Text'], '1.0.0')
    expect(cmd.options.title).toBe('Title')
    expect(cmd.options.text).toBe('Text')
  })

  it('no longer supports pause/resume/toggle/reset', () => {
    for (const gone of ['pause', 'resume', 'toggle', 'reset']) {
      const cmd = new Command([gone], '1.0.0')
      expect(cmd.hasSupportedCommand).toBe(false)
    }
  })
})
