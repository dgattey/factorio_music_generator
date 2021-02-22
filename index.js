const { parseCommandLineArgs } = require('./source/args')
const { generateAllMods } = require('./source/generate')

const run = async () => {
    // Parse the command line values
    const values = parseCommandLineArgs()
    if (!values) {
        return
    }

    // Generate the mods
    await generateAllMods(values)
}

run()