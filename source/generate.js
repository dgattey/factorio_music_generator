const fs = require('fs')
const path = require('path')
const { progress } = require('./log')
const { saveThumbnail } = require('./imageAssets')
const { saveInfoJson, saveBaseLuaData } = require('./textAssets')

const startFile = (data, modIndex) => (modIndex - 1) * data.chunkSize + 1
const endFile = (data, modIndex) => Math.min(modIndex * data.chunkSize, data.sourceFilesCount)

// Grabs and returns the `fileType` files in the `destination` folder
const getMusicFiles = async ({ fileType }, originalFolder) => {
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
    const description = isBaseMod 
        ? `Base mod for ${data.modName}, a music mod for Factorio`
        : `Tracks ${startFile(data, modIndex)} to ${endFile(data, modIndex)} of ${data.modName}, a music mod for Factorio`

    // Create mod folder and thumb/info
    const destinationLocation = `${data.destination}/${modFolderName}`
    await fs.promises.mkdir(destinationLocation, { recursive: true })
    await saveThumbnail(data.destination, humanName, modFolderName)
    await saveInfoJson(data, humanName, description, modFolderName, modIndex)

    // Create data.lua or copy music (music files are DEST files for base mod, SOURCE for other mods)
    if (isBaseMod) {
        await saveBaseLuaData(data, musicFiles)
    } else {
        await copyMusicFiles(data, modFolderName, modIndex, musicFiles)
    }
}

// Creates the output directory or deletes if necessary
const setupOutputDirectory = async ({ destination, clear }) => {
    if (clear) {
        await progress(fs.promises.rmdir(destination, { recursive: true }), 'Delete old output directory')
    }
    await progress(fs.promises.mkdir(destination, { recursive: true }), 'Create output directory')
}

// Counts the number of files that are of ogg type in current directory, then generates mods in groups of 20
const generateAllMods = async (data) => {
    const sourceFiles = await getMusicFiles(data, data.source)
    const sourceFilesCount = sourceFiles.length
    const modCount = Math.ceil(sourceFilesCount / data.chunkSize)
    if (sourceFilesCount < 1) {
        throw TypeError(`No source files found`)
    }
    
    data.modCount = modCount
    data.sourceFilesCount = sourceFilesCount
    data.modFolderName = data.modName.replace(/[^A-Z0-9]/ig, '_')

    console.log(`Generating ${data.modCount} mods from ${data.sourceFilesCount} source files...`)

    // Clear/create destination folder, generate the mods, then grab their music files and create the base mod with them
    await setupOutputDirectory(data)
    await progress(Promise.all(Array(data.modCount).fill().map((_, index) => generateMod(data, sourceFiles, index + 1))), `Generate music pack mods`)
    const destMusicFiles = await getMusicFiles(data, data.destination)
    await progress(generateMod(data, destMusicFiles), 'Generate base mod')
}

module.exports = {
    generateAllMods
}