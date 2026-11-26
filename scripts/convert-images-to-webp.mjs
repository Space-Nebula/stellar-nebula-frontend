import { readdir } from 'node:fs/promises'
import { extname, join } from 'node:path'
import sharp from 'sharp'

const directories = ['public', 'src/assets']
const supported = new Set(['.png', '.jpg', '.jpeg'])

async function listImages(directory) {
  let entries
  try {
    entries = await readdir(directory, { withFileTypes: true })
  } catch (error) {
    if (error.code === 'ENOENT') return []
    throw error
  }

  const nested = await Promise.all(
    entries.map((entry) => {
      const path = join(directory, entry.name)
      return entry.isDirectory()
        ? listImages(path)
        : supported.has(extname(entry.name).toLowerCase())
          ? [path]
          : []
    })
  )

  return nested.flat()
}

const images = (await Promise.all(directories.map((directory) => listImages(directory)))).flat()

for (const image of images) {
  const output = image.replace(/\.(png|jpe?g)$/i, '.webp')
  await sharp(image).webp({ quality: 85, effort: 6 }).toFile(output)
  console.log(`${image} -> ${output}`)
}

console.log(`Optimized ${images.length} image(s) as WebP at quality 85.`)
