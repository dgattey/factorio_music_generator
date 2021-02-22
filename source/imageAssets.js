const fs = require('fs')
const { createCanvas } = require('canvas')

// Saves a square thumbnail for a given index with some text on it
const saveThumbnail = async (destination, text, modFolderName) => {
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
    await fs.promises.writeFile(`${destination}/${modFolderName}/thumbnail.png`, buffer)
}

module.exports = {
    saveThumbnail
}