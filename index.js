const { parseCommandLineArgs } = require('./source/args')
const {
  getSourceData,
  generateAllMods,
  setupOutputDirectory,
} = require('./source/generate')
const { zipMods } = require('./source/zip')
const log = require('./source/log')

// This is in an async function so we can actually try to
const run = async () => {
  // Parse command line args to data for the app to use, printing out help if that option is passed
  const cmdLineData = await parseCommandLineArgs()
  if (cmdLineData.help) {
    log.help()
    return
  }

  // Find source files, generate the mod folders, then zip them into mod packages
  const sourceData = await getSourceData(cmdLineData)
  log.info(
    `Generating ${sourceData.modCount} mods from ${sourceData.sourceFilesCount} source files...`,
  )
  await setupOutputDirectory(cmdLineData)
  await generateAllMods({ ...cmdLineData, ...sourceData })
  await zipMods(cmdLineData)
}

// Some errors are expected - this will simply log the message of any errors we encounter + the help message and fail gracefully
try {
  run()
} catch (error) {
  log.error(error.message)
}

// Setup handler for handling rejection errors
process.on('unhandledRejection', (reason) => {
  log.error(reason)
})
