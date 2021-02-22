const { parseCommandLineArgs } = require('./source/args')
const { generateAllMods } = require('./source/generate')
const { zipMods } = require('./source/zip')

const run = async () => {
    // Parse the command line values
    const values = parseCommandLineArgs()
    if (!values) {
        return
    }

    // Generate the mod folders, then zip them into mod packages
    await generateAllMods(values)
    await zipMods(values)
}

run()