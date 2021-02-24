const path = require('path')
const createLogger = require('progress-estimator')
const { flagUsageDescriptions } = require('./args')

// Prints an error message in red
const error = (message) => {
  console.log(`\n\x1b[41mError: ${message}\x1b[0m`)
  help()
}

// Prints a help message using the base usage + formatted flag descriptions from args
const help = () => {
  const pathOfApp = path.basename(process.argv.slice(1)[0])
  const baseUsageText = `Usage: ${process.argv0} ${pathOfApp} [options] [flags]

    Options:`
  console.log(`\n${baseUsageText}\n\n${flagUsageDescriptions().join('\n')}\n`)
}

// Prints some info to the console
const info = (message) => {
  console.log(`\n\x1b[36m${message}\x1b[0m`)
}

module.exports = {
  error,
  help,
  info,
  progress: createLogger(),
}
