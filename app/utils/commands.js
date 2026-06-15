import log from 'electron-log/main.js'

const allOptions = {
  title: {
    long: '--title',
    short: '-T',
    description: 'Specify title for next break (Long or Mini)',
    withValue: true
  },
  text: {
    long: '--text',
    short: '-t',
    description: 'Specify text for next break (Long break only)',
    withValue: true
  }
}

const allCommands = {
  help: {
    description: 'Show this help message'
  },
  version: {
    description: 'Show current Stretchly version'
  },
  logs: {
    description: 'Show location of logs file'
  },
  mini: {
    description: 'Show a Mini break, customize it',
    options: [allOptions.title]
  },
  long: {
    description: 'Show a Long break, customize it',
    options: [allOptions.text, allOptions.title]
  },
  preferences: {
    description: 'Open Preferences window'
  }
}

const allExamples = [{
  cmd: 'stretchly mini -T "Stretch up!"',
  description: 'Show a Mini break, with the title "Stretch up!"'
},
{
  cmd: 'stretchly long -T "Stretch up!" -t "Go stretch!"',
  description: 'Show a Long break, with the title "Stretch up!" and text "Go stretch!"'
},
{
  cmd: 'stretchly preferences',
  description: 'Open Preferences window'
}]

// Parse cmd line, check if valid and put variables in a dedicated object
class Command {
  constructor (input, version, isFirstInstance = true) {
    this.version = version
    this.isFirstInstance = isFirstInstance
    this.supported = allCommands
    this.hasSupportedCommand = false

    this.parse(input)
  }

  parse (input) {
    // filter out electron flags first
    let i = 0
    while (i < input.length && input[i].startsWith('--')) {
      i++
    }

    const args = input.slice(i)
    this.command = args[0]

    if (this.command === undefined) {
      this.command = 'preferences'
    }

    if (!this.supported[this.command]) {
      log.error(`Stretchly${this.isFirstInstance ? '' : ' 2'}: command '${this.command}' is not supported`)
      return
    }

    this.options = this.getOpts(args.slice(1))
    this.hasSupportedCommand = true
  }

  getOpts (opts) {
    const options = {}

    if (!this.supported[this.command].options) {
      return null
    }

    for (let i = 0; i < opts.length; i++) {
      const name = opts[i]
      let valid = false

      this.supported[this.command].options.forEach(opt => {
        if (opt.long === name || opt.short === name) {
          valid = true
          if (opt.withValue) {
            options[opt.long.slice(2)] = opts[i + 1]
            i++
          } else {
            options[opt.long.slice(2)] = true
          }
        }
      })

      if (!valid) {
        log.error(`Stretchly${this.isFirstInstance ? '' : ' 2'}: option '${name}' is not valid for command '${this.command}'`)
      }
    }

    return options
  }

  runOrForward () {
    switch (this.command) {
      case 'help':
        this.help()
        break

      case 'version':
        this.ver()
        break

      case 'logs':
        this.logs()
        break

      default:
        if (this.hasSupportedCommand) {
          log.info(`Stretchly${this.isFirstInstance ? '' : ' 2'}: forwarding command '${this.command}' to the main instance`)
        }
    }
  }

  checkInMain () {
    if (!this.command) {
      return false
    }

    if (this.command === 'version' || this.command === 'help') {
      return false
    }

    return true
  }

  ver () {
    console.log(`Stretchly version ${this.version}`)
  }

  logs () {
    console.log(log.transports.file.getFile().path)
  }

  cmdHelp () {
    let i = 0
    const options = '[options]'
    let part = `Usage: stretchly <command> ${options}\n\nCommands:`

    const cmds = Object.keys(this.supported).map(key => `${key}${this.supported[key].options === undefined ? '' : ` ${options}`}`)
    const longuest = cmds.reduce((acc, cur) => acc > cur.length ? acc : cur.length, 0)

    part = Object.keys(this.supported).reduce((acc, key) => {
      const padding = longuest - cmds[i].length
      const line = `stretchly ${cmds[i]}${' '.repeat(padding)} ${this.supported[key].description}`
      i++
      return `${acc}\n\t${line}`
    }, part)

    return part
  }

  optionsHelp () {
    let part = '\n\nOptions:'

    const longuest = Object.keys(allOptions).reduce((acc, key) => acc > allOptions[key].long.length ? acc : allOptions[key].long.length, 0)

    part = Object.keys(allOptions).reduce((acc, key) => {
      const opt = allOptions[key]
      const padding = longuest - opt.long.length
      const line = `${opt.short}, ${opt.long}${' '.repeat(padding)} ${opt.description}`
      return `${acc}\n\t${line}`
    }, part)

    return part
  }

  examplesHelp () {
    let part = '\n\nExamples:'

    const longuest = allExamples.reduce((acc, cur) => acc > cur.cmd.length ? acc : cur.cmd.length, 0)

    part = allExamples.reduce((acc, ex) => {
      const padding = longuest - ex.cmd.length
      const line = `${ex.cmd}${' '.repeat(padding)} ${ex.description}`
      return `${acc}\n\t${line}`
    }, part)

    return part
  }

  help () {
    console.log([this.cmdHelp(), this.optionsHelp(), this.examplesHelp()].join(''))
  }
}

export default Command
