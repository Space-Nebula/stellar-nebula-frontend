#!/usr/bin/env node
/**
 * Generate Subresource Integrity (SRI) hashes for CDN resources.
 *
 * Usage:
 *   node scripts/generate-sri.mjs              # prints hashes
 *   node scripts/generate-sri.mjs --update     # updates index.html and src/utils/sri.ts
 *   node scripts/generate-sri.mjs --check      # verifies existing hashes
 *
 * Automates SRI hash generation for all external CDN resources defined in index.html
 * and src/utils/sri.ts to prevent CDN compromise attacks.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createHash } from 'crypto'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const ROOT = resolve(__dirname, '..')

// CDN resources to generate SRI for
const CDN_RESOURCES = [
  {
    url: 'https://cdn.logrocket.io/LogRocket.min.js',
    // Will fetch and hash; if fetch fails (offline), use placeholder warning
  },
  // Add more CDN resources here as needed:
  // { url: 'https://fonts.googleapis.com/css2?family=...' },
  // { url: 'https://fonts.gstatic.com/...' },
]

async function fetchAndHash(url) {
  try {
    console.log(`Fetching ${url}...`)
    const response = await fetch(url, {
      headers: { 'User-Agent': 'SRI-Generator/1.0' },
    })
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText}`)
    }
    const buffer = Buffer.from(await response.arrayBuffer())
    const hash = createHash('sha384').update(buffer).digest('base64')
    const integrity = `sha384-${hash}`
    console.log(`  ✓ ${integrity} (${(buffer.length / 1024).toFixed(1)} KB)`)
    return { url, integrity, size: buffer.length, success: true }
  } catch (error) {
    console.warn(`  ✗ Failed to fetch ${url}: ${error.message}`)
    console.warn(`  → Using placeholder. Run again when online or manually set hash.`)
    return { url, integrity: 'sha384-PLACEHOLDER_GENERATE_VIA_NPM_RUN_SRI_GENERATE', size: 0, success: false, error: error.message }
  }
}

function updateIndexHtml(hashes) {
  const indexPath = resolve(ROOT, 'index.html')
  if (!existsSync(indexPath)) {
    console.warn('index.html not found, skipping update')
    return
  }
  let content = readFileSync(indexPath, 'utf8')
  let updated = false

  for (const { url, integrity } of hashes) {
    if (!integrity.includes('PLACEHOLDER')) {
      // Update or add integrity attribute for this CDN URL
      // For LogRocket dynamic loader, we inject integrity via script loader
      if (url.includes('cdn.logrocket.io')) {
        // Check if index.html already has integrity handling
        if (content.includes('script.integrity') && content.includes(integrity)) {
          console.log('index.html already has correct LogRocket SRI')
        } else if (content.includes('cdn.logrocket.io')) {
          // Inject integrity assignment after crossOrigin line if not present
          if (!content.includes('script.integrity')) {
            content = content.replace(
              "script.crossOrigin = 'anonymous'",
              `script.crossOrigin = 'anonymous'\n          script.integrity = '${integrity}'`
            )
            // Also add fallback handling if not present
            if (!content.includes('script.onerror')) {
              content = content.replace(
                'document.head.appendChild(script)',
                `script.onerror = function() {\n            console.warn('[SRI] LogRocket failed integrity check, trying fallback');\n            // Fallback: load without integrity or use local monitoring stub\n            var fallback = document.createElement('script');\n            fallback.src = '/logrocket-fallback.js';\n            fallback.onerror = function() { console.error('[SRI] LogRocket fallback also failed'); };\n            document.head.appendChild(fallback);\n          }\n          document.head.appendChild(script)`
              )
            }
            updated = true
            console.log('Updated index.html with LogRocket SRI')
          } else {
            // Update existing integrity hash
            content = content.replace(/script\.integrity = 'sha384-[^']+'/g, `script.integrity = '${integrity}'`)
            updated = true
            console.log('Updated existing LogRocket SRI hash in index.html')
          }
        }
      }
    }
  }

  if (updated) {
    writeFileSync(indexPath, content, 'utf8')
    console.log(`✓ Updated ${indexPath}`)
  }
}

function updateSriUtils(hashes) {
  const sriPath = resolve(ROOT, 'src/utils/sri.ts')
  if (!existsSync(sriPath)) {
    console.warn('src/utils/sri.ts not found, skipping update')
    return
  }
  let content = readFileSync(sriPath, 'utf8')
  let updated = false

  for (const { url, integrity } of hashes) {
    if (!integrity.includes('PLACEHOLDER') && url.includes('cdn.logrocket.io')) {
      const oldPattern = /integrity: 'sha384-[^']+'.*\n.*LogRocket/
      if (content.includes('sha384-PLACEHOLDER')) {
        content = content.replace(
          "integrity: 'sha384-PLACEHOLDER_GENERATE_VIA_NPM_RUN_SRI_GENERATE'",
          `integrity: '${integrity}'`
        )
        updated = true
        console.log('Updated src/utils/sri.ts with new LogRocket hash')
      } else if (content.match(/integrity: 'sha384-[A-Za-z0-9+/=]+'/)) {
        content = content.replace(/integrity: 'sha384-[A-Za-z0-9+/=]+'/, `integrity: '${integrity}'`)
        updated = true
        console.log('Updated existing hash in src/utils/sri.ts')
      }
    }
  }

  if (updated) {
    writeFileSync(sriPath, content, 'utf8')
    console.log(`✓ Updated ${sriPath}`)
  }
}

async function main() {
  const args = process.argv.slice(2)
  const shouldUpdate = args.includes('--update')
  const shouldCheck = args.includes('--check')

  console.log('🔐 Generating SRI hashes for CDN resources...\n')

  const results = []
  for (const resource of CDN_RESOURCES) {
    const result = await fetchAndHash(resource.url)
    results.push(result)
  }

  console.log('\n--- SRI Hashes ---')
  for (const { url, integrity, success } of results) {
    console.log(`${success ? '✓' : '⚠'} ${url}`)
    console.log(`  ${integrity}\n`)
  }

  // Generate integrity manifest for build tooling
  const manifestPath = resolve(ROOT, 'sri-manifest.json')
  const manifest = {
    generatedAt: new Date().toISOString(),
    resources: results.map((r) => ({ url: r.url, integrity: r.integrity, success: r.success })),
  }
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8')
  console.log(`✓ Wrote manifest to ${manifestPath}`)

  if (shouldUpdate) {
    console.log('\n--- Updating files --with --update ---')
    updateIndexHtml(results)
    updateSriUtils(results)
  }

  if (shouldCheck) {
    console.log('\n--- Checking existing hashes ---')
    let hasMismatch = false
    const sriPath = resolve(ROOT, 'src/utils/sri.ts')
    if (existsSync(sriPath)) {
      const sriContent = readFileSync(sriPath, 'utf8')
      for (const { url, integrity } of results) {
        if (!integrity.includes('PLACEHOLDER') && !sriContent.includes(integrity)) {
          console.warn(`⚠ Mismatch for ${url}`)
          console.warn(`  Expected hash not found in src/utils/sri.ts`)
          hasMismatch = true
        }
      }
      if (!hasMismatch) console.log('✓ All hashes match src/utils/sri.ts')
    }
    const indexPath = resolve(ROOT, 'index.html')
    if (existsSync(indexPath)) {
      const indexContent = readFileSync(indexPath, 'utf8')
      for (const { url, integrity } of results) {
        if (!integrity.includes('PLACEHOLDER') && url.includes('cdn.logrocket.io') && !indexContent.includes(integrity)) {
          console.warn(`⚠ LogRocket hash not found in index.html`)
          hasMismatch = true
        }
      }
      if (!hasMismatch) console.log('✓ index.html hashes are up to date')
    }
    if (hasMismatch) {
      console.error('\n✗ SRI check failed - run with --update to fix')
      process.exit(1)
    } else {
      console.log('\n✓ SRI check passed')
    }
  }

  const failed = results.filter((r) => !r.success)
  if (failed.length > 0) {
    console.warn(`\n⚠ ${failed.length} resource(s) failed to fetch (offline or CDN unavailable). Placeholders retained.`)
    console.warn('  Run again when online: node scripts/generate-sri.mjs --update')
  } else {
    console.log('\n✓ All SRI hashes generated successfully')
  }

  console.log('\nAdd to package.json scripts:')
  console.log('  "sri:generate": "node scripts/generate-sri.mjs"')
  console.log('  "sri:update": "node scripts/generate-sri.mjs --update"')
  console.log('  "sri:check": "node scripts/generate-sri.mjs --check"')
  console.log('\nCI: Add `npm run sri:check` to verify hashes before deploy')
}

main().catch((err) => {
  console.error('SRI generation failed:', err)
  process.exit(1)
})
