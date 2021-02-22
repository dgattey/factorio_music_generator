const fs   = require('fs')
const path = require('path')
const { createCanvas } = require('canvas')
const json2lua = require('json2lua')
const { zipMods } = require('./zip')

const { logError, logHelpMessage, progressLogger } = require('./log.js')
const { allArgs } = require('./args.js')

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
}

// Generates a list of all tracks to be saved to the base mod's data.lua
const saveBaseLuaData = async (data, destinationMusicFiles) => {
    const allTracks =  destinationMusicFiles.map((destinationFile, index) => {
        const modIndex = Math.ceil((index + 1) / data.chunkSize)
        const filename = path.basename(destinationFile)
        const filepath = `__${data.modFolderName}_${modIndex}__/${filename}`
        return {
            type: 'ambient-sound',
            name: `${data.modFolderName}-${filename}`,
            track_type: 'main-track',
            sound: {
                filename: filepath,
            }
        }
    })

    // Write to file, making sure to add Factorio's `data:extend` directive + taking out extra chars
    const rawLuaCode = json2lua.fromString(JSON.stringify(allTracks))
    const fullFormattedCode = `data:extend(${rawLuaCode.replace(/\["/g, '').replace(/"\]/g, '')})`
    await fs.promises.writeFile(`${data.destination}/${data.modFolderName}/data.lua`, fullFormattedCode)
}

// Copies music files from source to destination for a particular mod
const copyMusicFiles = async (data, modFolderName, modIndex, musicFiles) => {
    for (let index = startFile(data, modIndex) - 1; index < endFile(data, modIndex); index++) {
        const filename = path.basename(musicFiles[index])
        await fs.promises.copyFile(musicFiles[index], `${data.destination}/${modFolderName}/${filename}`)
    }
}

// Creates a folder, generates info.json, thumbnail.png, data.lua, and copies the files
const generateMod = async (data, musicFiles, modIndex = -1) => {
    const isBaseMod = modIndex < 0
    const modFolderName = isBaseMod ? data.modFolderName : `${data.modFolderName}_${modIndex}`
    const humanName = isBaseMod ? `${data.modName} (Base)` : `${data.modName} (Pack ${modIndex})`

    // Create mod folder and thumb/info
    const destinationLocation = `${data.destination}/${modFolderName}`
    await fs.promises.mkdir(destinationLocation, { recursive: true })
    await saveThumbnail(data, humanName, modFolderName)
    await saveInfoJson(data, humanName, modFolderName, modIndex)

    // Create data.lua or copy music (music files are DEST files for base mod, SOURCE for other mods)
    if (isBaseMod) {
        await saveBaseLuaData(data, musicFiles)
    } else {
        await copyMusicFiles(data, modFolderName, modIndex, musicFiles)
    }
}

// Counts the number of files that are of ogg type in current directory, then generates mods in groups of 20
const generateAllMods = async (data) => {
    const sourceFiles = await getSourceFiles(data)
    const sourceFilesCount = sourceFiles.length
    const modCount = Math.ceil(sourceFilesCount / data.chunkSize)
    if (sourceFilesCount < 1) {
        logError('No source files found')
        logHelpMessage(allArgs)
        return
    }
    console.log(`Generating ${modCount} mods from ${sourceFilesCount} source files...`)
    
    data.modCount = modCount
    data.sourceFilesCount = sourceFilesCount
    data.modFolderName = data.modName.replace(/[^A-Z0-9]/ig, '_')

    // Clear/create destination folder
    if (data.clear) {
        await progressLogger(fs.promises.rmdir(data.destination, { recursive: true }), 'Delete old output directory')
    }
    await progressLogger(fs.promises.mkdir(data.destination, { recursive: true }), 'Create output directory')

    // Generate the mods, then grab their music files and create the base mod with them
    await progressLogger(Promise.all(Array(modCount).fill().map((_, index) => generateMod(data, sourceFiles, index + 1))), `Generate music pack mods`)
    const destMusicFiles = await getDestFiles(data)
    await progressLogger(generateMod(data, destMusicFiles), 'Generate base mod')

    // Finally, do another pass around to zip the folders and delete the files
    await zipMods(data)
}

module.exports = {
    generateAllMods
}