const fs   = require('fs')
const path = require('path')
const Zip = require('adm-zip')
const { progressLogger } = require('./log')

// Async function that runs the zipping for a given folder. Factorio expects the modVersion to be appended
const zipMod = async (destination, modVersion, folderName) => {
    const folderPath = path.resolve(destination, folderName)
    const zip = new Zip()
    const zipName = `${folderName}_${modVersion}.zip`
    await zip.addLocalFolderPromise(folderPath, folderName)
    await zip.writeZipPromise(`${destination}/${zipName}`)
    await fs.promises.rmdir(folderPath, { recursive: true })
}

// Zips each mod folder, then deletes the mod folder. Called as a second pass
const zipMods = async ({ destination, modVersion }) => {
    const possibleFolders = await fs.promises.readdir(destination, { withFileTypes: true })
    const promises = possibleFolders
        .filter((folder) => folder.isDirectory())
        .map((folder) => zipMod(destination, modVersion, folder.name))
    await progressLogger(Promise.all(promises), `Zip folders into mods`)
}

module.exports = {
    zipMods
}