const path = require('path')
const createLogger = require('progress-estimator')

// Usage text, for use with help text
const pathOfApp = path.basename(process.argv.slice(1)[0])
const usageText = `Usage: ${process.argv0} ${pathOfApp} [options] [flags]

Options:`

// Prints an error message in red
const logError = (message) => {
    console.log(`\n\x1b[41mError: ${message}\x1b[0m`)
}

// Prints a help message from the args
const logHelpMessage = (allArgs) => {
    const allArgKeys = Object.keys(allArgs)
    const messages = allArgKeys.reduce((messages, key) => {
        const argData = allArgs[key]
        let message = argData.placeholderName ? `${key} <${argData.placeholderName}>` : key
        message = argData.aliases.length > 0 ? [message, ...argData.aliases].join(', ') : message
        return [...messages, message]
    }, [])
    const maxLength = messages.reduce((maxValue, message) => Math.max(maxValue, message.length), 0)
    const paddedMessages = messages.map((message, index) => 
        `    ${message.padEnd(maxLength + 4, ' ')}\t${allArgs[allArgKeys[index]].description}`
    )
    console.log(`\n${usageText}\n\n${paddedMessages.join('\n')}\n`)
}

module.exports = {
    logError,
    logHelpMessage,
    progressLogger: createLogger(),
}