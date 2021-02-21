const { SingleBar, Presets } = require('cli-progress')
const { parseCommandLineArgs } = require('./source/args')
const { generateAllMods } = require('./source/generate')

const run = async () => {
    // Parse the command line values
    const values = parseCommandLineArgs()
    if (!values) {
        return
    }

    // Create a progress bar that looks slick
    const progressBar = new SingleBar({
        hideCursor: true,
    }, Presets.shades_grey)

    // Generate the mods
    await generateAllMods(values, progressBar)

    // Stop the progress bar finally
    progressBar.stop()
}

run()