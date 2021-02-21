const fs   = require('fs')
const path = require('path')
const { createCanvas } = require('canvas')
const json2lua = require('json2lua')

const { logError, logHelpMessage } = require('./log.js')
const { allArgs } = require('./args.js')

// Represents constant overhead work per mod (one for info.json, thumbnail.png, folder itself)
const overheadWork = 3

const startFile = (data, modIndex) => (modIndex - 1) * data.chunkSize + 1
const endFile = (data, modIndex) => Math.min(modIndex * data.chunkSize, data.sourceFilesCount)

// Grabs and returns the `fileType` files in the `destination` folder
const getImages = async (originalFolder, fileType) => {
    async function* getFiles(directory) {
        const files = await fs.promises.readdir(directory, { withFileTypes: true })
        for (const file of files) {
            const item = path.resolve(directory, file.name)
            if (file.isDirectory()) {
                yield* getFiles(item)
            } else {
                yield item
            }
        }
    }
    
    const fileTester = new RegExp(`\\.${fileType}$`)
    let foundFiles = []
    for await (const file of getFiles(originalFolder)) {
        if (fileTester.test(file)) {
            foundFiles.push(file)
        }
    }
    return foundFiles.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
}

// Grabs and returns the `fileType` files in the `source` folder
const getSourceFiles = async (data) => await getImages(data.source, data.fileType)

// Grabs and returns the `fileType` files in the `destination` folder
const getDestFiles = async (data) => await getImages(data.destination, data.fileType)

// Saves a square thumbnail for a given index with some text on it
const saveThumbnail = async (data, text, modFolderName) => {
    const size = 144 // default thumbnail size
    const canvas = createCanvas(size, size)
    const context = canvas.getContext('2d')
    context.fillStyle = '#158'
    context.fillRect(0, 0, size, size)
    context.font = 'bold 12pt Menlo'
    context.textAlign = 'left'
    context.textBaseline = 'top'

    context.fillStyle = '#fff'
    const words = text.split(' (')
    context.fillText(words[0].replace(' ', '\n'), size/8, size/8)

    context.fillStyle = '#ccc'
    context.font = 'regular 8pt Menlo'
    context.textBaseline = 'bottom'
    context.fillText(`(${words[1]}`, size/8, size - size/8)

    // Write it out
    const buffer = canvas.toBuffer('image/png')
    await fs.promises.writeFile(`${data.destination}/${modFolderName}/thumbnail.png`, buffer)
    data.progress.increment()
}

// Saves the info.json file to each mod folder
const saveInfoJson = async (data, humanName, modFolderName, modIndex) => {
    const isBaseMod = modIndex < 0
    const introInfo = isBaseMod 
        ? `Base mod for`
        : `Tracks ${startFile(data, modIndex)} to ${endFile(data, modIndex)} of`
    const info = {
        name: modFolderName,
        version: data.modVersion,
        factorio_version: data.factorioVersion,
        title: humanName,
        author: data.author,
        contact: data.contact,
        description: `${introInfo} ${data.modName}, a music mod for Factorio`,
        dependencies: [
            'base >= 1.0.0'
        ]
    }

    // Add dependencies on non-base mods for the base one
    if (isBaseMod) {
        for (let modIndex = 1; modIndex <= data.modCount; modIndex++) {
            info.dependencies.push(`${data.modFolderName}_${modIndex} >= 1.0`)
        }
    }

    // Write it out
    const infoJson = JSON.stringify(info, null, 4)
    await fs.promises.writeFile(`${data.destination}/${modFolderName}/info.json`, infoJson)
    data.progress.increment()
}

// Generates a list of all tracks to be saved to the base mod's data.lua
const saveBaseLuaData = async (data, destinationMusicFiles) => {
    const allTracks =  destinationMusicFiles.map((destinationFile, index) => ({
        type: 'ambient-sound',
        name: `${data.modFolderName}-${index}`,
        track_type: 'main-track',
        sound: {
            filename: `__${data.modFolderName}__/${path.relative(data.destination, destinationFile)}`
        }
    }))

    // Write to file, making sure to add Factorio's `data:extend` directive + taking out extra chars
    const rawLuaCode = json2lua.fromString(JSON.stringify(allTracks))
    const fullFormattedCode = `data:extend(${rawLuaCode.replace(/\["/g, '').replace(/"\]/g, '')})`
    await fs.promises.writeFile(`${data.destination}/${data.modFolderName}/data.lua`, fullFormattedCode)
    data.progress.increment()
}

// Copies music files from source to destination for a particular mod
const copyMusicFiles = async (data, modFolderName, modIndex, musicFiles) => {
    for (let index = startFile(data, modIndex) - 1; index < endFile(data, modIndex); index++) {
        const filename = path.basename(musicFiles[index])
        await fs.promises.copyFile(musicFiles[index], `${data.destination}/${modFolderName}/${filename}`)
        data.progress.increment()
    }
}

// Creates a folder, generates info.json, thumbnail.png, data.lua, and copies the files
const generateMod = async (data, musicFiles, modIndex = -1) => {
    const isBaseMod = modIndex < 0
    const modFolderName = isBaseMod ? data.modFolderName : `${data.modFolderName}_${modIndex}`
    const humanName = isBaseMod ? `${data.modName} (Base)` : `${data.modName} (Pack ${modIndex})`

    // Create mod folder
    await fs.promises.mkdir(`${data.destination}/${modFolderName}`, { recursive: true })
    data.progress.increment()
    
    // Thumbnail + info JSON
    await saveThumbnail(data, humanName, modFolderName)
    await saveInfoJson(data, humanName, modFolderName, modIndex)

    if (isBaseMod) {
        // Create data.lua if base - the music files here are DESTINATION files
        await saveBaseLuaData(data, musicFiles)
    } else {
        // Copy the right music to the folders - the music folders here are all the SOURCE files
        await copyMusicFiles(data, modFolderName, modIndex, musicFiles)
    }
}

// Counts the number of files that are of ogg type in current directory, then generates mods in groups of 20
const generateAllMods = async (data, progressBar) => {
    const sourceFiles = await getSourceFiles(data)
    const sourceFilesCount = sourceFiles.length
    if (sourceFilesCount < 1) {
        logError('No source files found')
        logHelpMessage(allArgs)
        return
    }
    const modCount = Math.ceil(sourceFilesCount / data.chunkSize)

    data.modCount = modCount
    data.sourceFilesCount = sourceFilesCount
    data.modFolderName = data.modName.replace(/[^A-Z0-9]/ig, '_')

    console.log(`Generating ${modCount} mods from ${sourceFilesCount} source files...`)

    // Work is per mod + each source file + data.lua in base mod + creation of dest folder
    const totalWork = overheadWork * (modCount + 1) + sourceFilesCount + 2

    // Show a fancy progress bar
    data.progress = progressBar
    data.progress.start(totalWork, 0)

    // Generate each of the individual mods after the destination folder + base mod
    if (data.clear) {
        await fs.promises.rmdir(data.destination, { recursive: true })
    }
    await fs.promises.mkdir(data.destination, { recursive: true })
    data.progress.increment()
    for (let index = 1; index <= modCount; index++) {
        await generateMod(data, sourceFiles, index)
    }

    // Create base mod once we've added all the music files
    const destMusicFiles = await getDestFiles(data)
    await generateMod(data, destMusicFiles)
}

module.exports = {
    generateAllMods
}