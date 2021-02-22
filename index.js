const { parseCommandLineArgs } = require('./source/args')
const { generateAllMods } = require('./source/generate')
const { zipMods } = require('./source/zip')
const log = require('./source/log')

// This is in an async function so we can actually try to 
const run = async () => {
    // Parse command line args to data for the app to use, printing out help if that option is passed
    const data = await parseCommandLineArgs()
    if (data.help) {
        log.help()
        return
    }
    
    // Generate the mod folders, then zip them into mod packages
    await generateAllMods(data)
    await zipMods(data)
}

// Some errors are expected - this will simply log the message of any errors we encounter + the help message and fail gracefully
try {
    run()
} catch (error) {
    log.error(error.message)
}