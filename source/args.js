const arg = require('arg')
const { logError, logHelpMessage } = require('./log.js')

const defaultChunkSize = 20
const defaultModVersion = '1.0.0'
const defaultSource = './music'
const defaultDest = './generatedMods'
const defaultType = 'ogg'

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
    '--fileType': new Arg(['-t'], String, `the file type to use as music`, defaultType, `extension`),
    '--author': new Arg([], String, `your name to add as the author of the mods`, 'Anonymous', `name`),
    '--contact': new Arg([], String, `your contact info for inclusion in the mods`, 'N/A', `email`),
    '--clear': new Arg([], Boolean, `ALL DESTINATION FOLDER CONTENTS WILL BE DELETED. NO CONFIRMATION.`, false),
}
const allArgKeys = Object.keys(allArgs)

// Returns a flag-less object -> value mapping if it exists in `parsedArgs` or defaults (otherwise errors)
const simplifiedArgs = (parsedArgs) => {
    const unflagged = (value) => value.replace(/--/, '')
    const simplifiedArgs = Object.keys(allArgs)
        .filter((key) => allArgs[key].defaultValue)
        .reduce((defaultArgs, key) => ({ ...defaultArgs, [unflagged(key)]: allArgs[key].defaultValue }), {})

    // Ensure we have all required args
    const requiredArgs = Object.keys(allArgs).filter((key) => allArgs[key].isRequired)
    for (index in requiredArgs) {
        if (parsedArgs[requiredArgs[index]] === undefined) {
            throw new arg.ArgError(`required argument ${requiredArgs[index]} is missing`)
        }
    }

    // Add all parsed args
    for (parsedArg in parsedArgs) {
        if (allArgs[parsedArg]) {
            simplifiedArgs[unflagged(parsedArg)] = parsedArgs[parsedArg]
        }
    }
    return simplifiedArgs
}
// TODO: move to top level so I can avoid passing args to log help message
// Parses the args from command line, returning success
const parseCommandLineArgs = () => {
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
            logHelpMessage(allArgs)
            return
        }
        return simplifiedArgs(parsedArgs)
    } catch (error) {
        logError(error.message)
        logHelpMessage(allArgs)
        return
    }
}

// Export the function that generates values
module.exports = {
    parseCommandLineArgs,
    allArgs,
}