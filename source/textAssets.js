const fs = require('fs')
const path = require('path')
const json2lua = require('json2lua')

// Generates the shared info json for both base and non-base
const sharedInfoJson = (data, humanName, description, modFolderName) => ({
  name: modFolderName,
  version: data.modVersion,
  factorio_version: data.factorioVersion,
  title: humanName,
  author: data.author,
  contact: data.contact,
  description,
  dependencies: ['base >= 1.0.0'],
})

// Saves the info.json file to each mod folder
const saveInfoJson = async (
  data,
  humanName,
  description,
  modFolderName,
  modIndex,
) => {
  const info = sharedInfoJson(data, humanName, description, modFolderName)

  // Add dependencies on non-base mods for the base one, and add descriptions both times
  if (modIndex < 0) {
    for (let index = 1; index <= data.modCount; index++) {
      info.dependencies.push(`${modFolderName} >= 1.0`)
    }
  }

  // Write it out
  const infoJson = JSON.stringify(info, null, 4)
  await fs.promises.writeFile(
    `${data.destination}/${modFolderName}/info.json`,
    infoJson,
  )
}

// Generates a list of all tracks to be saved to the base mod's data.lua
const saveBaseLuaData = async (data, destinationMusicFiles) => {
  const allTracks = destinationMusicFiles.map((destinationFile, index) => {
    const modIndex = Math.ceil((index + 1) / data.chunkSize)
    const filename = path.basename(destinationFile)
    const filepath = `__${data.modFolderName}_${modIndex}__/${filename}`
    return {
      type: 'ambient-sound',
      name: `${data.modFolderName}-${filename}`,
      track_type: 'main-track',
      sound: {
        filename: filepath,
      },
    }
  })

  // Write to file, making sure to add Factorio's `data:extend` directive + taking out extra chars
  const rawLuaCode = json2lua.fromString(JSON.stringify(allTracks))
  const fullFormattedCode = `data:extend(${rawLuaCode
    .replace(/\["/g, '')
    .replace(/"\]/g, '')})`
  await fs.promises.writeFile(
    `${data.destination}/${data.modFolderName}/data.lua`,
    fullFormattedCode,
  )
}

module.exports = {
  saveInfoJson,
  saveBaseLuaData,
}
