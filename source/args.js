const arg = require('arg')
const fs = require('fs')

// Grab version from package.json
const appVersion = require('../package.json').version

// Usage text, for use with help text
const pathOfApp = process.argv.slice(1)[0].split('/')
const usageText = `Usage: ${process.argv0} ${pathOfApp[pathOfApp.length - 1]} [options] [flags]

Options:`

const defaultChunkSize = 20
const defaultModVersion = '1.0.0'
const defaultSource = './music'
const defaultDest = './generatedMods'

// Creates an argument from a string flag value, the type of flag, any aliases for it, and a description
class Arg {
    constructor(aliases, type, description, defaultValue = undefined, placeholderName = '') {
        this.aliases = aliases
        this.type = type
        this.description = defaultValue ? `${description} (defaults to ${defaultValue})` : description
        this.placeholderName = placeholderName
        this.defaultValue = defaultValue

        // Required if there's no default value
        this.isRequired = defaultValue === undefined
    }
}

// All possible args we support - use defaults 
const allArgs = {
    '--help': new Arg(['-h'], Boolean, 'displays help information', false),
    '--modName': new Arg(['-n'], String, `the name of the mod itself`),
    '--modVersion': new Arg(['-m'], String, `version of the base mod itself`, defaultModVersion, `version`),
    '--factorioVersion': new Arg(['-f'], String, 'version of Factorio to target with the mods'),
    '--chunkSize': new Arg(['--size', '-c'], Number, `the number of audio files to include in one mod`, defaultChunkSize, `value`),
    '--source': new Arg(['-s'], String, `the location of the source files`, defaultSource, `folder`),
    '--destination': new Arg(['-d'], String, `the location of the destination mods`, defaultDest, `folder`),
}
const allArgKeys = Object.keys(allArgs)

// Returns a flag-less object -> value mapping if it exists in `parsedArgs` or defaults (otherwise errors)
const simplifiedArgs = (parsedArgs) => {
    const unflagged = (value) => value.replace(/--/, '')
    const simplifiedArgs = Object.keys(allArgs)
        .filter((key) => allArgs[key].defaultValue)
        .reduce((defaultArgs, key) => ({ ...defaultArgs, [unflagged(key)]: allArgs[key].defaultValue }), {})
    const requiredArgs = Object.keys(allArgs).filter((key) => allArgs[key].isRequired)
    for (index in requiredArgs) {
        const parsedValue = parsedArgs[requiredArgs[index]]
        if (parsedValue === undefined) {
            throw new arg.ArgError(`required argument ${requiredArgs[index]} is missing`)
        }
        simplifiedArgs[unflagged(requiredArgs[index])] = parsedValue
    }
    
    return simplifiedArgs
}

// Prints an error message in red
const logError = (message) => {
    console.log(`\n\x1b[41mError: ${message}\x1b[0m`)
}

// Prints a help message from the args
const logHelpMessage = () => {
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

// Parses the args from command line, returning success
const values = () => {
    // Transform args to flags as the arg library expects (aliases and args with types)
    const flagsWithTypes = allArgKeys.reduce((obj, key) => {
        const argData = allArgs[key]
        obj[key] = argData.type
        argData.aliases.reduce((aliasObject, aliasKey) => Object.assign(aliasObject, {[aliasKey]: key}), obj)
        return obj
    }, {})

    // Parse the args, printing errors or the help message if needed
    try {
        const parsedArgs = arg(flagsWithTypes)
        if (parsedArgs['--help']) {
            logHelpMessage()
            return
        }
        return simplifiedArgs(parsedArgs)
    } catch (error) {
        logError(error.message)
        logHelpMessage()
        return
    }
}

// Export the version + args
module.exports = {
    appVersion,
    values,
}