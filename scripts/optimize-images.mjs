#!/usr/bin/env node
/**
 * Enforce the image budget for bundled and public images.
 *
 * Usage: node scripts/optimize-images.mjs [--max-kb 100]
 *
 * - Fails when any image under public/ or src/assets/ exceeds the budget (default 100 KB)
 * - Fails when a PNG/JPEG has no WebP sibling for the browser fallback pair
 */

import { promises as fs } from 'node:fs'
import { join, extname } from 'node:path'

const DIRS = ['public', 'src/assets']
const IMAGE_EXT = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.avif', '.svg'])
const MAX_KB = Number(process.argv.find((_, i, a) => a[i - 1] === '--max-kb') || 100)

async function walk(dir, files = []) {
  let entries
  try {
    entries = await fs.readdir(dir, { withFileTypes: true })
  } catch {
    return files
  }
  for (const entry of entries) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) await walk(path, files)
    else if (IMAGE_EXT.has(extname(entry.name).toLowerCase())) files.push(path)
  }
  return files
}

const files = (await Promise.all(DIRS.map((dir) => walk(dir)))).flat()
const known = new Set(files)
let failed = false

for (const file of files) {
  const { size } = await fs.stat(file)
  const kb = size / 1024
  if (kb > MAX_KB) {
    console.error(`✗ ${file} is ${kb.toFixed(1)} KB (budget ${MAX_KB} KB)`)
    failed = true
  }
  if (/\.(png|jpe?g)$/i.test(file) && !known.has(file.replace(/\.(png|jpe?g)$/i, '.webp'))) {
    console.error(`✗ ${file} has no .webp sibling (run npm run images:optimize)`)
    failed = true
  }
}

if (failed) process.exit(1)
console.log(`✓ ${files.length} image(s) within the ${MAX_KB} KB budget`)
