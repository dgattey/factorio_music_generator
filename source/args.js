const arg = require('arg')

// Creates an argument from a string flag value, the type of flag, any aliases for it, and a description
class Arg {
  constructor(
    aliases,
    type,
    description,
    defaultValue = undefined,
    placeholderName = '',
  ) {
    this.aliases = aliases
    this.type = type
    this.description = defaultValue
      ? `${description} (defaults to ${defaultValue})`
      : description
    this.placeholderName = placeholderName
    this.defaultValue = defaultValue

    // Required if there's no default value
    this.isRequired = defaultValue === undefined
  }

  // Used to get usage text incorporating the placeholder, aliases, and passed base flag name
  usage(flag) {
    const flagWithPlaceholder = this.placeholderName
      ? `${flag} <${this.placeholderName}>`
      : flag
    return this.aliases.length > 0
      ? [flagWithPlaceholder, ...this.aliases].join(', ')
      : flagWithPlaceholder
  }
}

// All possible args we support - use defaults
const args = {
  '--help': new Arg(['-h'], Boolean, 'displays help information', false),
  '--modName': new Arg(['-n'], String, `the name of the mod itself`),
  '--modVersion': new Arg(
    ['-m'],
    String,
    `version of the base mod itself`,
    '1.0.0',
    `version`,
  ),
  '--factorioVersion': new Arg(
    ['-f'],
    String,
    'version of Factorio to target with the mods',
  ),
  '--chunkSize': new Arg(
    ['--size', '-c'],
    Number,
    `the number of audio files to include in one mod`,
    20,
    `value`,
  ),
  '--source': new Arg(
    ['-s'],
    String,
    `the location of the source files`,
    './music',
    `folder`,
  ),
  '--destination': new Arg(
    ['-d'],
    String,
    `the location of the destination mods`,
    './generatedMods',
    `folder`,
  ),
  '--fileType': new Arg(
    ['-t'],
    String,
    `the file type to use as music`,
    'ogg',
    `extension`,
  ),
  '--author': new Arg(
    [],
    String,
    `your name to add as the author of the mods`,
    'Anonymous',
    `name`,
  ),
  '--contact': new Arg(
    [],
    String,
    `your contact info for inclusion in the mods`,
    'N/A',
    `email`,
  ),
  '--clear': new Arg(
    [],
    Boolean,
    `ALL DESTINATION FOLDER CONTENTS WILL BE DELETED. NO CONFIRMATION.`,
    false,
  ),
}

// Returns a flag-less object -> value mapping if it exists in `parsedArgs` or defaults (otherwise errors)
const simplify = (parsedData) => {
  // Converts flag names so instead of result['--thing'] we can do result.thing
  const cleanedFlag = (value) => value.replace(/--/, '')

  // Throw an error for missing flags
  Object.keys(args)
    .filter((flag) => args[flag].isRequired && parsedData[flag] === undefined)
    .forEach((missingFlag) => {
      throw new arg.ArgError(`required argument ${missingFlag} is missing`)
    })

  // Turn default flags into a mapping of flag -> default value
  const result = Object.keys(args)
    .filter((flag) => args[flag].defaultValue)
    .reduce(
      (result, defaultFlag) => ({
        ...result,
        [cleanedFlag(defaultFlag)]: args[defaultFlag].defaultValue,
      }),
      {},
    )

  // Add all parsed args into the result in same format
  Object.keys(parsedData).forEach(
    (parsedFlag) => (result[cleanedFlag(parsedFlag)] = parsedData[parsedFlag]),
  )

  return result
}

// Parses command line args into formatted KV pairs. Throws an error if parsing fails
const parseCommandLineArgs = async () => {
  // The arg library expects: arg -> type mapping, and alias -> args included in there too
  const formattedArgs = Object.keys(args).reduce((result, flag) => {
    result[flag] = args[flag].type
    args[flag].aliases.forEach((alias) => (result[alias] = flag))
    return result
  }, {})
  const parsedData = arg(formattedArgs)
  return simplify(parsedData)
}

// This creates a string of usage text for the args, formatting it so the descriptions align on the right and the flags and aliases are on the left
const flagUsageDescriptions = () => {
  const flags = Object.keys(args)
  const flagUsageMessages = flags.map((flag) => args[flag].usage(flag))
  const maxLength = flagUsageMessages.reduce(
    (maxValue, message) => Math.max(maxValue, message.length),
    0,
  )

  // Pad the usage message to max length plus a bit, then add the description in
  return flagUsageMessages.map(
    (message, index) =>
      `    ${message.padEnd(maxLength + 4, ' ')}\t${
        args[flags[index]].description
      }`,
  )
}

module.exports = {
  parseCommandLineArgs,
  flagUsageDescriptions,
}
